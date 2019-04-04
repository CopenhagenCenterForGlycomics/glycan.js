/*global window*/
'use strict';

import * as Glycan from './main';

let Iupac = Glycan.CondensedIupac.IO;

class IupacSugar extends Iupac(Glycan.Sugar) {}

window.Glycan = Object.assign({ IupacSugar },Glycan);