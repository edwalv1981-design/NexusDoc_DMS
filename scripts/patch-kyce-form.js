'use strict';
const fs = require('fs');
const path = 'C:/Users/USER/NexusDoc_DMS/client/src/pages/CumplimientoEntidadesForm.jsx';
let c = fs.readFileSync(path, 'utf8');

const from = c.indexOf("<motion className=\"expert-group\"><label>{L('beneficialOwners')}</label>");
const from2 = c.indexOf("<motion className=\"expert-group\"><label>{L('beneficialOwners')}</label>");
const start =
  c.indexOf("<motion className=\"expert-group\"><label>{L('beneficialOwners')}</label>") >= 0
    ? c.indexOf("<motion className=\"expert-group\"><label>{L('beneficialOwners')}</label>")
    : c.indexOf("<motion className=\"expert-group\"><label>{L('beneficialOwners')}</label>");
const startFinal =
  c.indexOf("<motion className=\"expert-group\"><label>{L('beneficialOwners')}</label>") >= 0
    ? c.indexOf("<motion className=\"expert-group\"><label>{L('beneficialOwners')}</label>")
    : c.indexOf("<motion className=\"expert-group\"><label>{L('beneficialOwners')}</label>");
