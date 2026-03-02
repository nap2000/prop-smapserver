"use strict";

function getBsElement(target) {
	if (!target) {
		return null;
	}
	if (typeof target === "string") {
		return document.querySelector(target);
	}
	if (target.jquery) {
		return target.length > 0 ? target[0] : null;
	}
	return target;
}

function bsModalShow(target, options) {
	var elem = getBsElement(target);
	if (elem && window.bootstrap && window.bootstrap.Modal) {
		var modal;
		if (options) {
			modal = window.bootstrap.Modal.getInstance(elem);
			if (modal) {
				modal.dispose();
			}
			modal = new window.bootstrap.Modal(elem, options);
		} else {
			modal = window.bootstrap.Modal.getOrCreateInstance(elem);
		}
		modal.show();
	}
}

function bsModalHide(target) {
	var elem = getBsElement(target);
	if (elem && window.bootstrap && window.bootstrap.Modal) {
		window.bootstrap.Modal.getOrCreateInstance(elem).hide();
	}
}

function bsTabShow(target) {
	var elem = getBsElement(target);
	if (elem && window.bootstrap && window.bootstrap.Tab) {
		window.bootstrap.Tab.getOrCreateInstance(elem).show();
	}
}

function bsDropdownToggle(target) {
	var elem = getBsElement(target);
	if (elem && window.bootstrap && window.bootstrap.Dropdown) {
		window.bootstrap.Dropdown.getOrCreateInstance(elem).toggle();
	}
}

function bsInitTooltips(selector) {
	if (!(window.bootstrap && window.bootstrap.Tooltip)) {
		return;
	}
	document.querySelectorAll(selector).forEach(function (elem) {
		window.bootstrap.Tooltip.getOrCreateInstance(elem);
	});
}

function bsTooltipSet(target, title) {
	var elem = getBsElement(target);
	if (!(elem && window.bootstrap && window.bootstrap.Tooltip)) {
		return;
	}
	elem.setAttribute("title", title);
	var tt = window.bootstrap.Tooltip.getOrCreateInstance(elem);
	tt.setContent({ ".tooltip-inner": title });
}

function bsTooltipSetAndShow(target, title) {
	var elem = getBsElement(target);
	if (!(elem && window.bootstrap && window.bootstrap.Tooltip)) {
		return;
	}
	bsTooltipSet(elem, title);
	window.bootstrap.Tooltip.getOrCreateInstance(elem).show();
}

window.bsModalShow = bsModalShow;
window.bsModalHide = bsModalHide;
window.bsTabShow = bsTabShow;
window.bsDropdownToggle = bsDropdownToggle;
window.bsInitTooltips = bsInitTooltips;
window.bsTooltipSet = bsTooltipSet;
window.bsTooltipSetAndShow = bsTooltipSetAndShow;
