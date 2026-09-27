import problemData from '../data/problems.json' with { type: 'json' };
export const icons = {
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  moon: '<path d="M20.5 13.2A8.5 8.5 0 0 1 10.8 3.5a8.5 8.5 0 1 0 9.7 9.7Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  left: '<path d="m15 5-7 7 7 7"/>',
  check: '<circle cx="12" cy="12" r="8.5"/><path d="m8 12 2.5 2.5 5-5"/>',
  circle: '<circle cx="12" cy="12" r="7" stroke-dasharray="2 3"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
  star: '<path d="m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.5l-5.7 3 1.1-6.3-4.6-4.5 6.4-.9Z"/>',
  bookmark: '<path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z"/>',
  shuffle: '<path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2.2 0 3.8-2.4 5.2-5m2.1-4C15 7 16 6 18 6h3m-4-4 4 4-4 4"/>',
  spark: '<path d="m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3Z"/>',
  calendar: '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 11h16m-11 4h2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
  trophy: '<path d="M8 3h8v6a4 4 0 0 1-8 0V3Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 1v5m-4 3h8m-6-3h4"/>',
  memory: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M10 10h4v4h-4zM9 3v3m6-3v3M9 18v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  send: '<path d="m21 3-7 18-4-7-7-4L21 3Zm0 0L10 14"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5.5 19c1.6-3 3.9-4.5 6.5-4.5S16.9 16 18.5 19"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19 13.2v-2.4l-2-.7a7 7 0 0 0-.7-1.6l.9-1.9-1.8-1.8-1.9.9a7 7 0 0 0-1.6-.7l-.7-2H8.8l-.7 2a7 7 0 0 0-1.6.7l-1.9-.9-1.8 1.8.9 1.9a7 7 0 0 0-.7 1.6l-2 .7v2.4l2 .7a7 7 0 0 0 .7 1.6l-.9 1.9 1.8 1.8 1.9-.9a7 7 0 0 0 1.6.7l.7 2h2.4l.7-2a7 7 0 0 0 1.6-.7l1.9.9 1.8-1.8-.9-1.9a7 7 0 0 0 .7-1.6l2-.7Z"/>',
  book: '<path d="M3 4h6a4 4 0 0 1 3 2 4 4 0 0 1 3-2h6v15h-6a4 4 0 0 0-3 2 4 4 0 0 0-3-2H3V4Zm9 2v15"/>',
  reset: '<path d="M4 10a8 8 0 1 1 2 8M4 4v6h6"/>',
};
// All problems, contest schedules, user statistics and judged results below are demo fixtures.
export const problems = problemData;
export const contests = [
  {id:1,title:'Nedmori Weekly Contest #028',month:'09 月',day:'27',date:'2026.09.27 · 14:00 — 16:00',status:'即将开始',kind:'upcoming',type:'OI 赛制',count:5,level:'普及 → 提高',intro:'五道循序渐进的算法题，涵盖模拟、二分与动态规划。给自己两小时，专注解决问题。',ids:[1003,1005,1007,1011,1014]},
  {id:2,title:'秋日练习赛 · 从基础出发',month:'10 月',day:'01',date:'2026.10.01 · 09:00 — 12:00',status:'开放报名',kind:'upcoming',type:'ACM 赛制',count:4,level:'入门 → 普及',intro:'为刚刚开始算法学习的你准备。练习输入输出、基础数据结构和清晰的实现。',ids:[1001,1004,1009,1013]},
  {id:3,title:'Nedmori Weekly Contest #027',month:'09 月',day:'20',date:'2026.09.20 · 14:00 — 16:00',status:'已结束',kind:'finished',type:'OI 赛制',count:4,level:'普及 → 提高',intro:'本场练习已结束，你仍可以打开题目继续练习。',ids:[1002,1006,1010,1012]},
];
export const users = [
  ['tourist','算法与远方',2684,412,'+32'],['jiangly','Keep it simple.',2618,389,'+24'],['rainbow','一题一世界',2487,356,'+18'],['Akari','慢慢来，也很快。',2365,328,'+41'],['Sora','每天进步一点点',2240,128,'+26'],['mori','Stay curious.',2186,276,'+15'],['north','向北走',2094,254,'+12'],['yuki','Hello, world.',2018,231,'+19'],
];
export const seedSubmissions = [
  {id:'S20486',pid:1004,status:'Accepted',language:'C++ 17',time:'12 ms',memory:'2.4 MB',date:'09-26 10:42',kind:'sample'},
  {id:'S20481',pid:1002,status:'Wrong Answer',language:'C++ 17',time:'18 ms',memory:'3.1 MB',date:'09-26 10:28',kind:'sample'},
  {id:'S20479',pid:1001,status:'Wrong Answer',language:'C++ 17',time:'3 ms',memory:'1.9 MB',date:'09-26 09:58',kind:'sample'},
  {id:'S20477',pid:1001,status:'Accepted',language:'C++ 17',time:'2 ms',memory:'1.8 MB',date:'09-26 09:54',kind:'sample'},
  {id:'S20475',pid:1001,status:'Runtime Error',language:'Java 17',time:'41 ms',memory:'22.7 MB',date:'09-25 21:17',kind:'sample'},
  {id:'S20472',pid:1001,status:'Accepted',language:'Python 3',time:'28 ms',memory:'8.6 MB',date:'09-25 16:35',kind:'sample'},
  {id:'S20469',pid:1001,status:'Time Limit Exceeded',language:'Python 3',time:'1,000 ms',memory:'8.9 MB',date:'09-25 16:28',kind:'sample'},
  {id:'S20466',pid:1001,status:'Compilation Error',language:'C++ 17',time:'—',memory:'—',date:'09-25 16:21',kind:'sample'},
  {id:'S20463',pid:1009,status:'Accepted',language:'C++ 17',time:'8 ms',memory:'1.8 MB',date:'09-25 15:12',kind:'sample'},
];
export const templates={
  'C++ 17':'#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    // 在这里写下你的解法\n\n    return 0;\n}\n',
  'Python 3':'import sys\n\ndef solve():\n    # 在这里写下你的解法\n    pass\n\nif __name__ == "__main__":\n    solve()\n',
  'Java 17':'import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        // 在这里写下你的解法\n    }\n}\n',
};
