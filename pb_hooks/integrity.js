function invalid(message) { throw new BadRequestError(message); }
function validate(app,r) {
  const name=r.collection().name, old=r.original();
  const immutable=['created_by','created'];
  const links={opportunities:['round','organization','person','currency'],opportunity_participants:['opportunity','person'],introductions:['opportunity','introducer','target'],commitments:['opportunity','currency'],receipts:['commitment','amount_minor','currency','received_at','evidence']};
  if(links[name]) immutable.push(...links[name]);
  if(!r.isNew()) for(const field of immutable) if(JSON.stringify(r.get(field))!==JSON.stringify(old.get(field))) invalid(field+' is immutable');
  if(name==='rounds' && !r.isNew() && r.getString('currency')!==old.getString('currency')) {
    if(app.findRecordsByFilter('opportunities','round = {:id}','',1,0,{id:r.id}).length) invalid('Currency cannot change after opportunities exist');
  }
  if(name==='opportunities') {
    if(Boolean(r.getString('organization'))===Boolean(r.getString('person'))) invalid('Specify exactly one investor: organization or person');
    const round=app.findRecordById('rounds',r.getString('round'));
    if(r.getString('currency')!==round.getString('currency')) invalid('Opportunity currency must match round');
    if(!r.getBool('proposed_known') && r.getFloat('proposed_minor')!==0) invalid('Set proposed_known for a proposed amount');
    if(r.getString('stage')==='passed' && !r.getString('pass_reason')) invalid('Passed opportunities require a reason');
  }
  if(name==='introductions' && r.getString('introducer')===r.getString('target')) invalid('Introducer and target must differ');
  if(['activities','notes','messages','drafts'].includes(name) && !r.getString('opportunity') && !r.getString('person')) invalid('Link an opportunity or person');
  if(name==='activities' && r.getString('status')==='completed' && !r.getString('completed_at')) invalid('Completed activities require completed_at');
  if(name==='commitments') {
    const opportunity=app.findRecordById('opportunities',r.getString('opportunity'));
    if(r.getString('currency')!==opportunity.getString('currency')) invalid('Commitment currency must match opportunity');
    if(r.getFloat('amount_minor')<=0) invalid('Commitment amount must be positive');
    if(r.getString('status')==='signed' && (!r.getString('signed_at')||!r.getString('evidence'))) invalid('Signed commitments require a date and evidence');
    const receipts=app.findRecordsByFilter('receipts','commitment = {:id} && status = "recorded"','',0,0,{id:r.id});
    let total=0;for(const receipt of receipts)total+=receipt.getFloat('amount_minor');
    if(total>r.getFloat('amount_minor') || (total>0 && r.getString('status')!=='signed')) invalid('Void existing receipts before reducing or cancelling a funded commitment');
  }
  if(name==='receipts') {
    if(r.getFloat('amount_minor')<=0) invalid('Receipt amount must be positive');
    const commitment=app.findRecordById('commitments',r.getString('commitment'));
    if(r.getString('currency')!==commitment.getString('currency')) invalid('Receipt currency must match commitment');
    if(!r.isNew() && old.getString('status')==='void' && r.getString('status')!=='void') invalid('Voided receipts cannot be restored; record a replacement');
    if(r.getString('status')==='void' && !r.getString('void_reason')) invalid('Voiding requires a reason');
    if(r.getString('status')==='recorded') {
      if(commitment.getString('status')!=='signed') invalid('Receipts require a signed commitment');
      const receipts=app.findRecordsByFilter('receipts','commitment = {:id} && status = "recorded" && id != {:receipt}','',0,0,{id:commitment.id,receipt:r.id});
      let total=r.getFloat('amount_minor');for(const receipt of receipts)total+=receipt.getFloat('amount_minor');
      if(total>commitment.getFloat('amount_minor')) invalid('Receipts exceed signed commitment');
    }
  }
}
function write(e) {
  const originalApp=e.app, r=e.record, name=r.collection().name, fresh=r.isNew(), body=e.requestInfo().body;
  originalApp.runInTransaction((app)=> {
    e.app=app;
    try {
      if(!fresh) {
        const current=app.findRecordById(name,r.id);
        if(typeof body.expected_revision!=='number'||!Number.isInteger(body.expected_revision)) invalid('expected_revision is required as an integer');
        if(current.getInt('revision')!==body.expected_revision || current.getInt('revision')!==r.original().getInt('revision')) throw new ApiError(409,'Revision conflict; read the record again before retrying.',{});
      }
      const actor=e.auth && e.auth.collection().name==='users' ? e.auth.id : '';
      r.set('_audit_actor',actor ? 'user:'+actor : 'superuser:'+(e.auth ? e.auth.id : ''));
      for(const field of ['revision','created_by','updated_by','created','updated']) if(Object.prototype.hasOwnProperty.call(body,field)) invalid(field+' is server managed');
      r.set('revision',fresh ? 1 : r.original().getInt('revision')+1);
      r.set('created_by',fresh ? actor : r.original().getString('created_by')); r.set('updated_by',actor);
      e.next();
    } finally { e.app=originalApp; }
  });
}
function snapshot(r) { const all=JSON.parse(JSON.stringify(r)), out={};for(const f of r.collection().fields.fieldNames())out[f]=all[f];return out; }
function audit(e,action) {
  const actor=e.record.getString('_audit_actor');if(!actor)return e.next();e.record.set('_audit_actor','');
  const before=action==='update'?snapshot(e.record.original()):null;
  e.next();
  const after=snapshot(e.record),changes=action==='create'?{after}:{before:{},after:{}};
  if(before)for(const field in after)if(JSON.stringify(before[field])!==JSON.stringify(after[field])){changes.before[field]=before[field];changes.after[field]=after[field];}
  const row=new Record(e.app.findCollectionByNameOrId('audit_log'));
  row.set('action',action);row.set('collection',e.record.collection().name);row.set('record',e.record.id);row.set('actor_type',actor.split(':')[0]);row.set('actor',actor.split(':')[1]);row.set('changes',changes);e.app.save(row);
}
module.exports={validate,write,audit};
