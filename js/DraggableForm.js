/* globals document,HTMLLabelElement,HTMLInputElement,window,Event */
'use strict';

import {default as PieMenu} from './PieMenu';

const wire_form_startdrag = (form) => {
  form.addEventListener('dragstart', evt => { evt.stopPropagation(); evt.target.click(); });
};

const wire_form_enddrag = (form) => {
  form.addEventListener('dragend', () => {
    form.reset();
  });
};

const wire_form_reset = (form) => {
  console.log('Wiring reset',form);
  form.addEventListener('submit', (evt) => {
    evt.preventDefault();
  },{capture: false});

  form.addEventListener('reset', () => {
    console.log('Hiding menus');
    let menus = form.querySelectorAll('x-piemenu');
    for (let menu of menus) {
      menu.removeAttribute('active');
    }
  });
};

const wire_menu_events = (piemenu) => {
  let last_selected = null;
  let selection_timeout = null;
  piemenu.addEventListener('dragenter', (ev) => {

      let targ = ev.target;
      if ( ! (targ instanceof HTMLLabelElement) ) {
        return;
      }
      if (targ === last_selected) {
        return;
      }
      last_selected = targ;

      for (let sib of targ.parentNode.children) {
        if (sib !== targ) {
          sib.classList.remove('hover');
        } else {
          sib.classList.add('hover');
        }
      }

      if (selection_timeout) {
        // Also clear this out for a dragend or a dragleave
        clearTimeout(selection_timeout);
      }

      let nextmenu = piemenu.nextElementSibling;

      if (! nextmenu || ! (nextmenu instanceof PieMenu )) {
        return;
      }

      selection_timeout = setTimeout( () => {

        if ( ! last_selected ) {
          return;
        }


        var event = new Event('click',{bubbles: true});
        event.pageX = ev.pageX;
        event.pageY = ev.pageY;
        last_selected.control.dispatchEvent(event);

        last_selected = null;
      },700);
    });
    piemenu.addEventListener('click', (ev) => {
      let targ = ev.target;
      if ( ! (targ instanceof HTMLInputElement) ) {
        return;
      }

      targ.checked = true;
      if ( ! ev.isTrusted ) {
        ev.preventDefault();        
      }

      clearTimeout(selection_timeout);

      piemenu.removeAttribute('active');

      let nextmenu = piemenu.nextElementSibling;
      if (! nextmenu || ! (nextmenu instanceof PieMenu )) {
        var event = new Event('submit',{bubbles: true});
        piemenu.parentNode.dispatchEvent(event);
        return;
      }

      nextmenu.setAttribute('active',true);
      let left_pos = Math.round(ev.pageX)-0.5*nextmenu.getBoundingClientRect().width;
      let top_pos = Math.round(ev.pageY)-0.5*nextmenu.getBoundingClientRect().height;
      let zoom = (window.innerWidth / document.documentElement.clientWidth).toFixed(2);
      nextmenu.style.transformOrigin = `${left_pos}px ${top_pos}px`;
      nextmenu.style.transform = `scale(${zoom}) translate(${left_pos}px,${top_pos}px)`;
      nextmenu.clear();
      console.log(targ,targ.checked);
    },{capture: false});

    piemenu.addEventListener('drop', (ev) => {
      let targ = ev.target;
      if ( ! (targ instanceof HTMLLabelElement) ) {
        return;
      }

      var event = new Event('click',{bubbles: true});
      event.pageX = ev.pageX;
      event.pageY = ev.pageY;

      last_selected.control.dispatchEvent(event);
    });

    piemenu.addEventListener('dragover', (ev) => {
      ev.preventDefault();
    });
    piemenu.addEventListener('dragleave', (ev) => {
      if (ev.relatedTarget !== piemenu) {
        return;
      }
      last_selected = null;
      piemenu.removeAttribute('active');
      piemenu.clear();
    });
};

const upgrade_piemenus = (form) => {
  let menus = form.querySelectorAll('x-piemenu');
  for (let menu of menus) {
    wire_menu_events(menu);
  }
};

const wire_events_form = (form) => {
  wire_form_startdrag(form);
  wire_form_enddrag(form);
  wire_form_reset(form);
};

class DraggableForm {
  constructor(form) {
    wire_events_form(form);
    upgrade_piemenus(form);
  }
}

export default DraggableForm;