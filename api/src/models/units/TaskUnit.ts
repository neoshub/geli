import * as mongoose from 'mongoose';
import {IUnitModel} from './Unit';
import {ITaskUnit} from '../../../../shared/models/units/ITaskUnit';
import {IUser} from '../../../../shared/models/IUser';
import {IProgress} from '../../../../shared/models/progress/IProgress';
import {ITaskUnitProgress} from '../../../../shared/models/progress/ITaskUnitProgress';
import {ITask} from '../../../../shared/models/task/ITask';
const MarkdownIt = require('markdown-it');

interface ITaskUnitModel extends ITaskUnit, IUnitModel {
  exportJSON: () => Promise<ITaskUnit>;
  calculateProgress: (users: IUser[], progress: IProgress[]) => Promise<ITaskUnit>;
  toFile: () => String;
}

const taskSchema = new mongoose.Schema(
  {
    name: {
      type: String
    },
    unitId: {
      type: String
    }
    ,
    answers: {
      type: [{
        value: Boolean,
        text: String
      }],
      required: true
    },
  }, {
    timestamps: true,
    toObject: {
      transform: function (doc: any, ret: any) {
        if (ret.hasOwnProperty('_id') && ret._id !== null) {
          ret._id =  ret._id.toString();
        }

        if (ret.hasOwnProperty('id') && ret.id !== null) {
          ret.id = ret.id.toString();
        }
        ret.answers = ret.answers.map((answer: any) => {
          answer._id = answer._id.toString();
          return answer;
        });
      }
    }
  }
);

const taskUnitSchema = new mongoose.Schema({
  tasks: [taskSchema],
  deadline: {
    type: String
  },
});

taskUnitSchema.methods.calculateProgress = async function (users: IUser[], progress: IProgress[]): Promise<ITaskUnit> {
  const unitObj = this.toObject();
  const progressStats: any[] = [];

  unitObj.tasks.forEach((question: ITask) => {
    const questionStats = {
      name: question.name,
      series: [{
        name: 'correct',
        value: 0
      },
      {
        name: 'wrong',
        value: 0
      },
      {
        name: 'no data',
        value: users.length
      }]
    };
    progress.forEach((userProgress: ITaskUnitProgress) => {
      let correctedAnswered = true;
      question.answers.forEach((answer) => {
        if (
          !userProgress.answers[question._id.toString()] ||
          userProgress.answers[question._id.toString()][answer._id.toString()] !== !!answer.value
        ) {
          correctedAnswered = false;
        }
      });

      if (correctedAnswered) {
        questionStats.series[0].value++;
      } else {
        questionStats.series[1].value++;
      }

      questionStats.series[2].value--;
    });

    progressStats.push(questionStats);
  });

  unitObj.progressData = progressStats;
  return unitObj;
};

taskUnitSchema.methods.toFile = function(): String {
  let fileStream = '';

  for (const task of this.tasks) {
    fileStream = fileStream + task.name + '\n';

    for (const answer of task.answers) {
      fileStream = fileStream + answer.text + ': [ ]\n';
    }
    fileStream = fileStream + '-------------------------------------\n';

  }

  return fileStream;
};

taskUnitSchema.methods.toHtmlForIndividualPdf = function (): String {
  const md = new MarkdownIt({html: true});
  let html = '<div id="pageHeader" style="text-align: center;border-bottom: 1px solid">'
    + md.render(this.name) + md.render(this.description ? null : '') + '</div>';

  let counter = 1;
  html += '<div style="page-break-after: always">';
  for (const task of this.tasks) {
     html += '<div><h3>' +  md.render(counter + '. ' + task.name) + '</h3></div>';
     counter++;
    for (const answer of task.answers) {
      html += '<div>' + md.render('<input type="checkbox" style="margin-right: 10px">' + answer.text) + '</div>';
    }
  }
  html += '</div ><div><h2>Solutions</h2></div>';
  counter = 1;
  for (const task of this.tasks) {
    html += '<div><h3>' +  md.render(counter + '. ' + task.name) + '</h3></div>';
    counter++;
    for (const answer of task.answers) {
      let checked = '';
      if (answer.value === true) {
        checked = 'checked';
      }
      html += '<div>' + md.render('<input type="checkbox" style="margin-right: 10px;" ' + checked + '>' + answer.text) + '</div>';
    }
  }

  return html;
};

export {taskUnitSchema, ITaskUnitModel};
