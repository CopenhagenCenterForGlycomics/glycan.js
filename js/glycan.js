/*global window*/
'use strict';

import * as Glycan from './index';

let Iupac = Glycan.CondensedIupac.IO;

let SVGEl = Glycan.SVGElement.IO;

class IupacSugar extends Iupac(Glycan.Sugar) {}

Glycan.IupacSugar = IupacSugar;

class SVGSugar extends SVGEl(Glycan.Sugar) {}

Glycan.SVGSugar = SVGSugar;

window.Glycan = Glycan;