import {setVisualAnswer} from './visuals.js';
export function earlyYearsSample(){
 const notes='An apple is a fruit. We count three apples by saying one, two, three. A circle is round. A square has four equal sides. A triangle has three sides. The letters A, B and C begin the alphabet. We can practise tracing these letters. We can draw a circle and colour a star. The numbers one, two and three are written 1, 2 and 3.';
 const spec={title:'My first shapes, letters & numbers',subject:'Early learning',level:'Kindergarten',notes,count:6,marksEach:1,minutes:30,format:'short',difficulty:'recall',presentation:'early'};
 const question=(prompt,answer,evidence,blocks)=>({kind:'short',prompt,marks:1,options:[],correctIndex:null,answer,marking:[{point:answer,marks:1}],evidence,blocks});
 const questions=[
  question('Count the apples. Write the number.','3','We count three apples by saying one, two, three.',[{type:'picture',icon:'apple',quantity:3,size:'large',caption:'',task:'count'},{type:'lines',count:1}]),
  question('Match each shape to its description.','','A circle is round. A square has four equal sides. A triangle has three sides.',[{type:'matching',pairs:[{left:'Circle',right:'Round'},{left:'Square',right:'Four equal sides'},{left:'Triangle',right:'Three sides'}],order:[2,0,1]}]),
  question('Trace the letters.','Trace A, B and C.','The letters A, B and C begin the alphabet.',[{type:'tracing',text:'A B C',rows:2}]),
  question('Draw a circle in the box.','A recognisable circle.','We can draw a circle and colour a star.',[{type:'drawing',height:45,label:'Draw your circle here.'}]),
  question('Write the missing numbers in the table.','One = 1; Two = 2; Three = 3.','The numbers one, two and three are written 1, 2 and 3.',[{type:'table',caption:'Numbers',headers:['Number word','Write the number'],rows:[['One',''],['Two',''],['Three','']]}]),
  question('Colour the star.','The star is coloured.','We can draw a circle and colour a star.',[{type:'picture',icon:'star',quantity:1,size:'large',caption:'',task:'illustration'}])
 ];
 questions[4].answerSpace='none';questions[5].answerSpace='none';
 questions.forEach(setVisualAnswer);
 return {spec,paper:{version:2,layout:{preset:'early',schoolName:'',term:''},instructions:'Teacher: read each instruction aloud. Let each child work at a comfortable pace.',questions},sample:true,approved:false,model:'Hand-authored Early Years example'};
}
