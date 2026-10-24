import { isIslandLand,COAST_PATH } from '@content/island';
import type { TownPosition } from '@game/systems/town-world';
export interface TownResident { readonly id:string; readonly name:string; readonly color:number; readonly route:readonly TownPosition[]; readonly dialogue:string; }
export const TOWN_RESIDENTS: readonly TownResident[] = [
  {id:'gardener',name:'Лида · садовница',color:0x7e9563,route:[{x:18,z:18},{x:30,z:18},{x:30,z:30},{x:18,z:30}],dialogue:'Поливаю сад по утрам. Если будет минутка, помоги клумбе у западной дорожки — лейка уже рядом.'},
  {id:'courier',name:'Артём · почтальон',color:0xc58e53,route:[{x:32,z:46},{x:32,z:48},{x:48,z:48},{x:48,z:46}],dialogue:'Несу письма в поликлинику. Её вход с южной стороны, у светлой дорожки. Спасибо, что помогаешь соседям!'},
  {id:'reader',name:'Нина · читательница',color:0xa27483,route:[{x:19,z:16},{x:30,z:16},{x:30,z:19},{x:19,z:19}],dialogue:'В библиотеке собираем истории нашего маленького мира. За городом есть круговая тропа: если идти всё время по ней, вернёшься домой.'},
  {id:'walker',name:'Миша · путешественник',color:0x648aa0,route:[{x:70,z:30},{x:78,z:30},{x:78,z:34},{x:70,z:34}],dialogue:'Здесь начинается восточный сад. Дальше по тропе — мельница и цветущий луг. Береговая дорожка огибает весь остров.'},
  {id:'painter',name:'Вера · художница',color:0xc48a6e,route:[{x:80,z:18},{x:92,z:18},{x:92,z:20},{x:80,z:20}],dialogue:'Рисую облака и мельницу. Отсюда видно море и цветущий сад. На карте острова отмечены все прогулочные дорожки.'},
  {id:'neighbour',name:'Олег · сосед',color:0x7b86b0,route:[{x:78,z:38},{x:92,z:38},{x:92,z:40},{x:78,z:40}],dialogue:'Ещё немного по тропе — и снова город. У нас маленький мир, поэтому забота о каждом особенно заметна.'},
];
export const TOWN_STOPS = [
  {id:'lighthouse',kind:'board',x:0,z:66.5,label:'Морской маяк · узнать о месте',text:'Морской маяк помогает лодкам возвращаться домой в сумерках. Его свет медленно обходит берег. Мастерская «Маяк», где выдают набор помощи, находится в городе.'},
  {id:'harbor',kind:'board',x:56.7,z:69,label:'Причал · прочитать',text:'Гавань Зареченска. По деревянному настилу можно пройти до конца причала. Лодки пришвартованы: любуемся морем и не перелезаем через ограждения.'},

  {id:'board',kind:'board',x:31,z:27,label:'Афиша · прочитать',text:'Сегодня в Зареченске: обмен книгами в библиотеке, помощь поликлинике и уход за общим садом. Присоединяйся!'},
  {id:'flowers',kind:'flowers',x:22,z:30,label:'Клумба · полить',text:'Ты полил клумбу. Цветы расправились — спасибо за заботу о нашем саде!'},
  {id:'book-swap',kind:'board',x:74,z:35,label:'Книгообмен · прочитать',text:'Возьми книгу — оставь историю. Соседи собирают здесь рассказы о добрых делах. Сегодня на полке: «Как помочь человеку рядом».'},
  {id:'pond',kind:'board',x:88,z:49,label:'Пруд · узнать о месте',text:'Этот пруд очищает дождевую воду для общего сада. Растения по краям помогают воде оставаться чистой. Береги их!'},
  {id:'lookout',kind:'board',x:98,z:32,label:'Указатель · прочитать',text:'Береговая тропа. Пройди вдоль моря мимо сада и мельницы, обогни остров и вернись в Зареченск.'},
] as const;
export const ISLAND_PONDS = [{x:88,z:58,width:14,depth:9},{x:80,z:5,width:10,depth:7}] as const;
export const WILD_BENCHES = [
  {x:71,z:38,rotation:0},{x:75,z:38,rotation:0},{x:85,z:51,rotation:Math.PI},
  {x:91,z:51,rotation:Math.PI},{x:83,z:28,rotation:0},{x:89,z:28,rotation:0},
];
export const WILD_TREES = Array.from({length:80},(_,i)=>({
  x:70+(i%6)*5+Math.sin(i*3.7),z:2+Math.floor(i/6)*5+Math.cos(i*2.3),rotation:i*1.7,scale:.85+(i%4)*.1,
})).filter(tree=>isIslandLand(tree)&&[16,32,48,70].every(z=>Math.abs(tree.z-z)>3.5)
  && [72,96].every(x=>Math.abs(tree.x-x)>2.5)
  && !ISLAND_PONDS.some(pond=>Math.abs(tree.x-pond.x)<pond.width/2+2&&Math.abs(tree.z-pond.z)<pond.depth/2+2)
  && !(tree.x>78&&tree.z>14&&tree.z<30)
  && !(tree.x>76&&tree.z>36&&tree.z<42)
  && !WILD_BENCHES.some(b=>Math.hypot(b.x-tree.x,b.z-tree.z)<2)
  && COAST_PATH.every(p=>Math.hypot(p.x-tree.x,p.z-tree.z)>3));
