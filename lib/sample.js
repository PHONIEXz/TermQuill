export const sampleSpec = {
  title: 'Elements, compounds & mixtures', subject: 'Chemistry', level: 'SS1', count: 6, marksEach: 2, minutes: 20, difficulty: 'mixed', format: 'mixed',
  notes: 'An element is a pure substance made of only one type of atom. Iron and oxygen are examples of elements. A compound contains two or more different elements chemically combined in fixed proportions. Water is a compound made of hydrogen and oxygen. A mixture contains two or more substances that are not chemically combined. The substances in a mixture retain their individual properties. Mixtures can be separated by physical methods. A magnet can separate iron filings from sand because iron is attracted to a magnet while sand is not. Filtration separates an insoluble solid from a liquid. Sand can be separated from water by filtration. Evaporation can recover dissolved salt from salt solution by removing the water. Compounds require chemical methods to separate them into their constituent elements.'
};
const mcq = (prompt, options, correctIndex, evidence) => ({kind:'mcq', prompt, options, correctIndex, evidence, answer:options[correctIndex], marks:2, marking:[{point:`Select ${'ABCD'[correctIndex]}: ${options[correctIndex]}`,marks:2}]});
const short = (prompt, answer, evidence, points) => ({kind:'short', prompt, answer, evidence, marks:2, options:[], correctIndex:null, marking:points.map(point => ({point,marks:1}))});
export const samplePaper = {
  instructions: 'Answer all six questions. For questions 1–3, choose one option. For questions 4–6, write your answers in the spaces provided.',
  questions: [
    mcq('Which statement describes an element?', ['Two substances mixed together','A substance made of only one type of atom','Different elements chemically combined','A solid dissolved in water'],1,'An element is a pure substance made of only one type of atom.'),
    mcq('Which of these is a compound?', ['Iron','Oxygen','Sand mixed with iron','Water'],3,'Water is a compound made of hydrogen and oxygen.'),
    mcq('Which method separates sand from water?', ['Filtration','Using a magnet','Chemical decomposition','Mixing'],0,'Sand can be separated from water by filtration.'),
    short('Explain why a magnet can separate iron filings from sand.','Iron is attracted to a magnet, while sand is not.','A magnet can separate iron filings from sand because iron is attracted to a magnet while sand is not.',['Iron filings are attracted to the magnet.','Sand is not attracted and remains behind.']),
    short('State two features of a mixture.','Its substances are not chemically combined and retain their individual properties.','A mixture contains two or more substances that are not chemically combined. The substances in a mixture retain their individual properties.',['Substances are not chemically combined.','Substances retain their individual properties.']),
    short('How would you recover salt from salt solution? Explain what happens to the water.','Use evaporation. The water is removed, leaving the salt behind.','Evaporation can recover dissolved salt from salt solution by removing the water.',['Use evaporation.','Water is removed, leaving salt behind.'])
  ]
};
