// Conference-adjusted fantasy points, validated against the model JSON snapshot.
// This is a research baseline trained with historical final NET ranks, not historical KenPom.
export function conferenceProjectionFeatures(rank, conferenceMeanRank, conferenceId, conferenceIds) {
  if (!Number.isFinite(rank) || rank < 1 || rank > 400 || !Number.isFinite(conferenceMeanRank))
    throw new Error('Valid rank and conference opponent mean rank are required.');
  const s=(365-rank)/364, t=(365-conferenceMeanRank)/364;
  const base=[1,s,s*s,s*s*s,Math.exp(-rank/30),t,t*t,s*t,Math.tanh((conferenceMeanRank-rank)/80),(s-t)*(s-t)];
  const id=String(conferenceId);
  return [...base,...conferenceIds.map(k=>id===String(k)?1:0),...conferenceIds.map(k=>id===String(k)?s-.5:0)];
}
export function projectConferencePoints({rank,conferenceMeanRank,conferenceId}, model) {
  if (!model?.coefficients?.conferences || !Array.isArray(model?.coefficients?.weights))
    throw new Error('Missing fitted projection coefficients.');
  const f=conferenceProjectionFeatures(rank,conferenceMeanRank,conferenceId,model.coefficients.conferences);
  if (f.length!==model.coefficients.weights.length) throw new Error('Projection coefficient count mismatch.');
  const p=f.reduce((n,v,i)=>n+v*model.coefficients.weights[i],0);
  return Math.round(Math.max(0,Math.min(145,p))*10)/10;
}
export function projectRatingsSnapshot(teams,model) {
  if (!Array.isArray(teams)) throw new Error('Teams must be an array.');
  const groups=new Map();
  for (const team of teams){
    const conf=String(team.conference_id);
    const arr=groups.get(conf)||[];arr.push(team);groups.set(conf,arr);
  }
  return teams.map(team=>{
    const arr=groups.get(String(team.conference_id));
    if(arr.length<2) throw new Error('Conference requires at least two rated programs: '+team.conference_id);
    const mean=(arr.reduce((n,t)=>n+Number(t.kenpom_rank),0)-Number(team.kenpom_rank))/(arr.length-1);
    return {...team,conference_mean_kenpom_rank:Math.round(mean*10)/10,
      projected_points:projectConferencePoints({rank:Number(team.kenpom_rank),conferenceMeanRank:mean,conferenceId:team.conference_id},model)};
  }).sort((a,b)=>b.projected_points-a.projected_points);
}
