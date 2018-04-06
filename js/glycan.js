/*global window*/
'use strict';

import * as Glycan from './index';

let Iupac = Glycan.CondensedIupac.IO;

class IupacSugar extends Iupac(Glycan.Sugar) {}

Glycan.IupacSugar = IupacSugar;

window.Glycan = Glycan;