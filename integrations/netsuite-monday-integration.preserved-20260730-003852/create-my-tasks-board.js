require('./env');
const TOKEN = process.env.MONDAY_API_TOKEN;
async function q(query, variables){
  const r = await fetch('https://api.monday.com/v2',{method:'POST',headers:{'Content-Type':'application/json',Authorization:TOKEN,'API-Version':'2023-10'},body:JSON.stringify({query,variables})});
  const j = await r.json();
  if(j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
}
(async()=>{
  // idempotent: reuse if a board with this exact name already exists
  const existing = await q(`query { boards(limit:200, state:active){ id name } }`);
  const match = (existing.boards||[]).find(b=>b.name==='My Tasks (synced)');
  if(match){ console.log('EXISTS', match.id); return; }
  const created = await q(`mutation { create_board(board_name:"My Tasks (synced)", board_kind: private){ id } }`);
  const boardId = created.create_board.id;
  console.log('CREATED', boardId);
  // add columns
  const cols = [
    {title:'Source Status', type:'text'},
    {title:'Source Board', type:'text'},
    {title:'Due', type:'date'},
    {title:'Source Link', type:'link'},
    {title:'Source Item ID', type:'text'},
    {title:'Last Synced', type:'text'},
  ];
  for(const c of cols){
    const res = await q(`mutation ($b: ID!, $t: String!, $ty: ColumnType!){ create_column(board_id:$b, title:$t, column_type:$ty){ id title type } }`, {b:boardId, t:c.title, ty:c.type});
    console.log('  col', res.create_column.title, '=>', res.create_column.id);
    await new Promise(r=>setTimeout(r,300));
  }
})().catch(e=>{console.error('ERR', e.message); process.exit(1);});
