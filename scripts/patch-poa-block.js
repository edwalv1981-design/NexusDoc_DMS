'use strict';
const fs = require('fs');
const p = require('path').join(__dirname, '../client/src/pages/FundacionForm.jsx');
let s = fs.readFileSync(p, 'utf8');

const open = '<div className="expert-grid" style={{ padding: \'20px\' }}>';
const close = '                        </motion.div>\n                    </motion.div>\n\n                    {/*';
const altClose = '                        </div>\n                    </div>\n\n                    {/*';

let i = s.indexOf(open);
if (i < 0) throw new Error('POA grid open not found');

let j = s.indexOf('                    {/* Configur', i);
if (j < 0) j = s.indexOf('                    {/* Configuraci', i);
if (j < 0) throw new Error('POA settings comment not found');

const replacement = `<div style={{ padding: '20px' }}>
                            <FundacionPersonFields
                                person={poaPersonFromFormData(formData)}
                                lang={lang}
                                t={t}
                                onChange={updatePoaField}
                            />
                        </div>
                    </div>

                    {/*`;

s = s.slice(0, i) + replacement + s.slice(j);
fs.writeFileSync(p, s);
console.log('POA block replaced');
