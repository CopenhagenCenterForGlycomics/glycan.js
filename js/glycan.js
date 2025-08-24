/*global */
'use strict';

import * as Glycan from './main.js';

let Iupac = Glycan.CondensedIupac.IO;

class IupacSugar extends Iupac(Glycan.Sugar) {}

window.Glycan = Object.assign({ IupacSugar },Glycan);