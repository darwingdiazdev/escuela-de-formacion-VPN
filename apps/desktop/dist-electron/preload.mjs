"use strict";
const electron = require("electron");
const api = {
  auth: {
    login: (email, password) => electron.ipcRenderer.invoke("auth:login", email, password)
  },
  users: {
    list: () => electron.ipcRenderer.invoke("users:list"),
    create: (input) => electron.ipcRenderer.invoke("users:create", input),
    update: (id, input) => electron.ipcRenderer.invoke("users:update", id, input)
  },
  students: {
    list: () => electron.ipcRenderer.invoke("students:list"),
    create: (input) => electron.ipcRenderer.invoke("students:create", input),
    update: (id, input) => electron.ipcRenderer.invoke("students:update", id, input),
    setEnrollmentPayment: (studentId, subjectId, church, paymentStatus) => electron.ipcRenderer.invoke(
      "students:setEnrollmentPayment",
      studentId,
      subjectId,
      church,
      paymentStatus
    ),
    retakeEnrollment: (studentId, subjectId, church) => electron.ipcRenderer.invoke("students:retakeEnrollment", studentId, subjectId, church)
  },
  teachers: {
    list: () => electron.ipcRenderer.invoke("teachers:list"),
    create: (input) => electron.ipcRenderer.invoke("teachers:create", input),
    update: (id, input) => electron.ipcRenderer.invoke("teachers:update", id, input)
  },
  subjects: {
    list: () => electron.ipcRenderer.invoke("subjects:list"),
    create: (input) => electron.ipcRenderer.invoke("subjects:create", input),
    update: (id, input) => electron.ipcRenderer.invoke("subjects:update", id, input)
  },
  grades: {
    list: () => electron.ipcRenderer.invoke("grades:list"),
    listAll: () => electron.ipcRenderer.invoke("grades:listAll"),
    create: (input) => electron.ipcRenderer.invoke("grades:create", input),
    update: (id, input) => electron.ipcRenderer.invoke("grades:update", id, input)
  },
  export: {
    saveExcel: (data, defaultFileName) => electron.ipcRenderer.invoke("export:saveExcel", data, defaultFileName)
  }
};
electron.contextBridge.exposeInMainWorld("api", api);
