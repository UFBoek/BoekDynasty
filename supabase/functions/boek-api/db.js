// Lightweight D1-compatible adapter backed by a transactional PostgreSQL client.
// Only the SQL features used by CBB Dynasty are supported.
export function createD1(pg) {
  const epoch = "floor(extract(epoch from now()))::integer";
  function normalize(statement) {
    let sql = statement.trim().replace(/;\s*$/, '')
      .replace(/\bunixepoch\(\)/gi, epoch)
      .replace(/\browid\b/gi, 'id');
    const ignore = /^INSERT\s+OR\s+IGNORE\s+INTO\b/i.test(sql);
    if (ignore) sql = sql.replace(/^INSERT\s+OR\s+IGNORE\s+INTO\b/i, 'INSERT INTO');
    if (ignore) sql += ' ON CONFLICT DO NOTHING';
    // SQL placeholders are positional ($1, $2...), excluding quoted literals.
    let index=0, quote=null, result='';
    for (let i=0;i<sql.length;i++) {
      const ch=sql[i];
      if (quote) {
        result+=ch;
        if(ch===quote){
          if(sql[i+1]===quote){result+=sql[++i];}
          else quote=null;
        }
      } else if(ch==="'"||ch==='"'){quote=ch;result+=ch;}
      else if(ch==='?') result+='$'+(++index);
      else result+=ch;
    }
    return result;
  }
  function prepare(query) {
    const stmt={query,args:[]};
    const api={
      bind(...args){stmt.args=args;return api;},
      async run(){return execute(pg,stmt,'run');},
      async all(){return execute(pg,stmt,'all');},
      async first(){return execute(pg,stmt,'first');},
      _statement:stmt
    };
    return api;
  }
  async function execute(connection,statement,mode){
    const rows=await connection.unsafe(normalize(statement.query),statement.args);
    // Postgres COUNT(*) returns int8 text. D1 returned JS numbers, and the
    // draft relies on numeric arithmetic for overall pick numbers.
    for (const row of rows) {
      for (const key of ['total','n','regular_wins','q1','q1a','q2','opening_wins','main_wins','played']) {
        if (typeof row[key] === 'string' && /^-?\\d+$/.test(row[key])) {
          const parsed=Number(row[key]);
          if (Number.isSafeInteger(parsed)) row[key]=parsed;
        }
      }
    }
    if(mode==='run')return {success:true,meta:{changes:Number(rows.count||0)}};
    if(mode==='first')return rows[0]||null;
    return {success:true,results:Array.from(rows)};
  }
  return {
    prepare,
    async transaction(callback){return pg.begin(async tx=>callback(createD1(tx)));},
    async batch(statements){
      return pg.begin(async tx=>{
        const out=[];
        for(const item of statements)out.push(await execute(tx,item._statement,'run'));
        return out;
      });
    }
  };
}
