const S = require('../services/readingAnalytics.service');

const win = (req)=>({ from:req.query.from?new Date(req.query.from):undefined, to:req.query.to?new Date(req.query.to):undefined });

async function avgSessionTimePerUser(req,res){ try{ res.json(await S.reportAvgSessionTimePerUser(win(req))); }catch(e){ res.status(500).json({error:'report failed'})}}
async function mostHighlightedBooks(req,res){ try{ res.json(await S.reportMostHighlightedBooks({ ...win(req), limit:Number(req.query.limit)||10 })); }catch(e){ res.status(500).json({error:'report failed'})}}
async function topBooksByTotalReadingTime(req,res){ try{ res.json(await S.reportTopBooksByTotalReadingTime({ ...win(req), limit:Number(req.query.limit)||10 })); }catch(e){ res.status(500).json({error:'report failed'})}}

module.exports = { avgSessionTimePerUser, mostHighlightedBooks, topBooksByTotalReadingTime };
