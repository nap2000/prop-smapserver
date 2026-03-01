(function initBootboxBridge() {
	if (window.bootbox) {
		return;
	}

	function nextId() {
		return "bb_bridge_" + Math.random().toString(36).slice(2);
	}

	function getTitle(opts) {
		return opts && opts.title ? opts.title : "";
	}

	function cleanup(modalEl) {
		if (!modalEl) {
			return;
		}
		modalEl.addEventListener("hidden.bs.modal", function onHidden() {
			modalEl.removeEventListener("hidden.bs.modal", onHidden);
			modalEl.remove();
		});
	}

	function createModalShell(options) {
		var id = nextId();
		var title = getTitle(options);
		var html = [
			'<div class="modal fade" id="', id, '" tabindex="-1" aria-hidden="true">',
			'<div class="modal-dialog', options && options.centerVertical ? ' modal-dialog-centered' : '', '">',
			'<div class="modal-content">',
			title ? '<div class="modal-header"><h5 class="modal-title">' + title + '</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>' : '',
			'<div class="modal-body"></div>',
			'<div class="modal-footer"></div>',
			'</div></div></div>'
		].join("");

		var container = document.createElement("div");
		container.innerHTML = html;
		var modalEl = container.firstChild;
		document.body.appendChild(modalEl);
		cleanup(modalEl);
		return modalEl;
	}

	function getBootstrapModal(modalEl) {
		if (!(window.bootstrap && window.bootstrap.Modal)) {
			return null;
		}
		return window.bootstrap.Modal.getOrCreateInstance(modalEl, { backdrop: true, keyboard: true });
	}

	function alertDialog(arg1, arg2) {
		var opts = typeof arg1 === "object" ? arg1 : { message: arg1, callback: arg2 };
		var message = opts && opts.message ? opts.message : "";
		var callback = opts && typeof opts.callback === "function" ? opts.callback : null;
		var modalEl = createModalShell(opts);
		modalEl.querySelector(".modal-body").innerHTML = message;
		var footer = modalEl.querySelector(".modal-footer");
		footer.innerHTML = '<button type="button" class="btn btn-primary">OK</button>';
		var okBtn = footer.querySelector("button");
		okBtn.addEventListener("click", function () {
			if (callback) {
				callback();
			}
			var modal = getBootstrapModal(modalEl);
			if (modal) {
				modal.hide();
			}
		});

		var modal = getBootstrapModal(modalEl);
		if (modal) {
			modal.show();
		}
		return modalEl;
	}

	function confirmDialog(arg1, arg2) {
		var opts;
		if (typeof arg1 === "object") {
			opts = arg1 || {};
		} else {
			opts = { message: arg1, callback: arg2 };
		}
		var callback = typeof opts.callback === "function" ? opts.callback : function () {};
		var modalEl = createModalShell(opts);
		modalEl.querySelector(".modal-body").innerHTML = opts.message || "";
		var footer = modalEl.querySelector(".modal-footer");
		footer.innerHTML = '<button type="button" class="btn btn-secondary" data-action="cancel">Cancel</button>' +
			'<button type="button" class="btn btn-primary" data-action="ok">OK</button>';

		var resolved = false;
		var modal = getBootstrapModal(modalEl);

		footer.querySelector('[data-action="cancel"]').addEventListener("click", function () {
			resolved = true;
			callback(false);
			if (modal) {
				modal.hide();
			}
		});
		footer.querySelector('[data-action="ok"]').addEventListener("click", function () {
			resolved = true;
			callback(true);
			if (modal) {
				modal.hide();
			}
		});

		modalEl.addEventListener("hidden.bs.modal", function () {
			if (!resolved) {
				callback(false);
			}
		});

		if (modal) {
			modal.show();
		}
		return modalEl;
	}

	function promptDialog(options) {
		var opts = options || {};
		var callback = typeof opts.callback === "function" ? opts.callback : function () {};
		var modalEl = createModalShell(opts);
		var body = modalEl.querySelector(".modal-body");
		var label = opts.message ? '<div class="mb-2">' + opts.message + '</div>' : "";
		body.innerHTML = label + '<input type="text" class="form-control" id="bb_prompt_input" />';
		var input = body.querySelector("#bb_prompt_input");
		if (typeof opts.value === "string") {
			input.value = opts.value;
		}
		var footer = modalEl.querySelector(".modal-footer");
		footer.innerHTML = '<button type="button" class="btn btn-secondary" data-action="cancel">Cancel</button>' +
			'<button type="button" class="btn btn-primary" data-action="ok">OK</button>';

		var resolved = false;
		var modal = getBootstrapModal(modalEl);

		footer.querySelector('[data-action="cancel"]').addEventListener("click", function () {
			resolved = true;
			callback(null);
			if (modal) {
				modal.hide();
			}
		});

		footer.querySelector('[data-action="ok"]').addEventListener("click", function () {
			resolved = true;
			var result = callback(input.value);
			if (result !== false && modal) {
				modal.hide();
			}
		});

		modalEl.addEventListener("shown.bs.modal", function () {
			input.focus();
		});
		modalEl.addEventListener("hidden.bs.modal", function () {
			if (!resolved) {
				callback(null);
			}
		});

		if (modal) {
			modal.show();
		}
		return modalEl;
	}

	window.bootbox = {
		alert: alertDialog,
		confirm: confirmDialog,
		prompt: promptDialog,
		hideAll: function () {
			document.querySelectorAll('.modal.show').forEach(function (modalEl) {
				var modal = getBootstrapModal(modalEl);
				if (modal) {
					modal.hide();
				}
			});
		}
	};
})();
