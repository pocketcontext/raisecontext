migrate((app) => {
  // PocketBase supplies users; RaiseContext never creates an auth collection.
  app.findCollectionByNameOrId('users');
  const access = "@request.auth.id != '' && @request.auth.collectionName = 'users' && @request.auth.disabled = false";
  const text = (name, required=false, max=2000) => ({name,type:'text',required,max});
  const rel = (name, collection, required=false) => ({name,type:'relation',collectionId:app.findCollectionByNameOrId(collection).id,maxSelect:1,required,cascadeDelete:false});
  const choice = (name,values,required=true) => ({name,type:'select',values,maxSelect:1,required});
  const date = name => ({name,type:'date'});
  const money = name => ({name,type:'number',min:0,max:9007199254740991,onlyInt:true});
  const currency = () => ({name:'currency',type:'text',required:true,pattern:'^[A-Z]{3}$',max:3});
  function create(name,fields,indexes=[],writable=true) {
    app.save(new Collection({name,type:'base',listRule:access,viewRule:access,createRule:writable?access:null,updateRule:writable?access:null,deleteRule:null,fields:fields.concat(writable ? [rel('created_by','users'),rel('updated_by','users'),{name:'revision',type:'number',required:true,min:1,onlyInt:true},{name:'created',type:'autodate',onCreate:true},{name:'updated',type:'autodate',onCreate:true,onUpdate:true}] : []),indexes}));
  }
  create('user_directory',[text('name',true,200)],[],false);
  create('organizations',[text('name',true,300),text('website'),text('description',false,20000),{name:'archived',type:'bool'}]);
  create('people',[text('name',true,300),rel('organization','organizations'),text('email'),text('role'),{name:'archived',type:'bool'}]);
  create('rounds',[text('name',true,300),currency(),money('target_minor'),choice('status',['planning','active','closed','cancelled']),date('opened_at'),date('closed_at'),text('description',false,20000)]);
  create('opportunities',[rel('round','rounds',true),rel('organization','organizations'),rel('person','people'),choice('stage',['research','introduction','contacted','meeting','diligence','decision','closed','passed']),rel('owner','users'),text('next_action'),date('next_action_at'),text('pass_reason'),money('proposed_minor'),{name:'proposed_known',type:'bool'},currency()],['CREATE UNIQUE INDEX idx_opportunity_organization ON opportunities (round,organization) WHERE organization != \'\'','CREATE UNIQUE INDEX idx_opportunity_person ON opportunities (round,person) WHERE person != \'\'']);
  create('opportunity_participants',[rel('opportunity','opportunities',true),rel('person','people',true),choice('role',['partner','decision_maker','associate','advisor','other']),{name:'active',type:'bool'}],['CREATE UNIQUE INDEX idx_participant ON opportunity_participants (opportunity,person)']);
  create('introductions',[rel('opportunity','opportunities',true),rel('introducer','people',true),rel('target','people',true),choice('status',['identified','requested','accepted','introduced','declined','cancelled']),text('evidence',false,20000),text('source'),date('follow_up_at')]);
  create('activities',[rel('opportunity','opportunities'),rel('person','people'),rel('owner','users'),choice('kind',['meeting','call','task']),text('title',true,500),text('body',false,20000),choice('status',['planned','completed','cancelled']),date('scheduled_at'),date('completed_at')]);
  create('notes',[rel('opportunity','opportunities'),rel('person','people'),choice('kind',['research','meeting','assessment','other']),text('title',true,500),text('body',true,100000),text('source'),date('verified_at')]);
  create('messages',[rel('opportunity','opportunities'),rel('person','people'),choice('direction',['incoming','outgoing']),text('subject',false,500),text('body',true,100000),text('source'),{name:'occurred_at',type:'date',required:true}]);
  create('drafts',[rel('opportunity','opportunities'),rel('person','people'),text('subject',false,500),text('body',true,100000),choice('status',['draft','approved','discarded'])]);
  create('commitments',[rel('opportunity','opportunities',true),money('amount_minor'),currency(),choice('status',['indicated','signed','cancelled']),text('evidence',false,20000),date('signed_at')]);
  create('receipts',[rel('commitment','commitments',true),money('amount_minor'),currency(),{name:'received_at',type:'date',required:true},text('evidence',true,20000),choice('status',['recorded','void']),text('void_reason')]);
  create('audit_log',[choice('action',['create','update']),text('collection',true),text('record',true),text('actor'),choice('actor_type',['user','superuser']),{name:'changes',type:'json',maxSize:5242880},{name:'created',type:'autodate',onCreate:true}],['CREATE INDEX idx_audit_record ON audit_log (collection,record,created)'],false);
  const settings=app.settings();settings.batch.enabled=true;settings.batch.maxRequests=20;settings.batch.timeout=5;app.save(settings);
}, () => { throw new Error('Restore a verified backup to roll back the initial schema.'); });
