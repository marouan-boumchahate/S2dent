// index.js — Aggregates and exports all seed operations as an array.
import * as createAcademy from './createAcademy.js';
import * as createProfessor from './createProfessor.js';
import * as createStudent from './createStudent.js';
import * as createDepartment from './createDepartment.js';
import * as issueCredential from './issueCredential.js';

export const operations = [
  createAcademy,
  createProfessor,
  createStudent,
  createDepartment,
  issueCredential,
];
