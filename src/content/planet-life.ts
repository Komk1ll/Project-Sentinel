import type { TownPosition } from '@game/systems/town-world';
export interface TownResident { readonly id:string; readonly name:string; readonly color:number; readonly route:readonly TownPosition[]; readonly dialogue:string; }
export const PLANET_RESIDENTS: readonly TownResident[] = [
  {id:'gardener',name:'Лида · садовница',color:0x7e9563,route:[{x:18,z:18},{x:30,z:18},{x:30,z:30},{x:18,z:30}],dialogue:'Поливаю сад по утрам. Если будет минутка, помоги клумбе у западной дорожки — лейка уже рядом.'},
  {id:'courier',name:'Артём · почтальон',color:0xc58e53,route:[{x:32,z:46},{x:32,z:48},{x:48,z:48},{x:48,z:46}],dialogue:'Несу письма в поликлинику. Её вход с южной стороны, у светлой дорожки. Спасибо, что помогаешь соседям!'},
  {id:'reader',name:'Нина · читательница',color:0xa27483,route:[{x:19,z:16},{x:30,z:16},{x:30,z:19},{x:19,z:19}],dialogue:'В библиотеке собираем истории нашего маленького мира. За городом есть круговая тропа: если идти всё время по ней, вернёшься домой.'},
  {id:'walker',name:'Миша · путешественник',color:0x648aa0,route:[{x:82,z:30},{x:92,z:30},{x:92,z:34},{x:82,z:34}],dialogue:'Это обратная сторона нашей планеты. Дальше по тропе — мельница и цветущий луг. Город никуда не исчез: он за горизонтом.'},
  {id:'painter',name:'Вера · художница',color:0xc48a6e,route:[{x:148,z:30},{x:158,z:30},{x:158,z:34},{x:148,z:34}],dialogue:'Рисую облака и мельницу. Смотри, как меняется горизонт, когда мы идём. А на карте можно увидеть всю планету.'},
  {id:'neighbour',name:'Олег · сосед',color:0x7b86b0,route:[{x:208,z:30},{x:218,z:30},{x:218,z:34},{x:208,z:34}],dialogue:'Ещё немного по тропе — и снова город. У нас маленький мир, поэтому забота о каждом особенно заметна.'},
];
export const PLANET_STOPS = [
  {id:'board',kind:'board',x:31,z:27,label:'Афиша · прочитать',text:'Сегодня в Зареченске: обмен книгами в библиотеке, помощь поликлинике и уход за общим садом. Присоединяйся!'},
  {id:'flowers',kind:'flowers',x:22,z:30,label:'Клумба · полить',text:'Ты полил клумбу. Цветы расправились — спасибо за заботу о нашем саде!'},
  {id:'book-swap',kind:'board',x:88,z:35,label:'Книгообмен · прочитать',text:'Возьми книгу — оставь историю. Соседи собирают здесь рассказы о добрых делах. Сегодня на полке: «Как помочь человеку рядом».'},
  {id:'pond',kind:'board',x:208,z:35,label:'Пруд · узнать о месте',text:'Этот пруд очищает дождевую воду для общего сада. Растения по краям помогают воде оставаться чистой. Береги их!'},
  {id:'lookout',kind:'board',x:128,z:29,label:'Указатель · прочитать',text:'Круговая тропа · 256 метров по экватору. Иди вдоль светлой дорожки, чтобы обойти весь мир и вернуться в Зареченск.'},
] as const;
export const PLANET_PONDS = [{x:208,z:18,width:15,depth:10},{x:112,z:59,width:11,depth:8}] as const;
export const WILD_BENCHES = [
  {x:85,z:38,rotation:0},{x:91,z:38,rotation:0},{x:205,z:27,rotation:Math.PI},
  {x:211,z:27,rotation:Math.PI},{x:149,z:36,rotation:0},{x:155,z:36,rotation:0},
];
export const WILD_TREES = Array.from({length:120},(_,i)=>({
  x:70+(i%20)*8.7+Math.sin(i*3.7)*2.4,
  z:3+Math.floor(i/20)*11+Math.cos(i*2.3)*2.8,
  rotation:i*1.7,scale:.85+(i%4)*.1,
})).filter(tree=>Math.abs(tree.z-32)>5 && !PLANET_PONDS.some(pond=>Math.abs(tree.x-pond.x)<pond.width/2+2&&Math.abs(tree.z-pond.z)<pond.depth/2+2)
  && !(Math.abs(tree.x-152)<6&&Math.abs(tree.z-24)<7));
