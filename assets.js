// Asset management with localStorage persistence
// Data shape in localStorage: { electronics: [{id,name,qty,cond}], furniture: [...], stationery: [...] }
document.addEventListener('DOMContentLoaded', function () {
	const STORAGE_KEY = 'assetsData_v1';
	const COUNTER_KEY = 'assetsCounter_v1';

	function getStoredData() {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { electronics: [], furniture: [], stationery: [] };
		try {
			return JSON.parse(raw);
		} catch (err) {
			console.error('Failed to parse assets data, resetting.', err);
			return { electronics: [], furniture: [], stationery: [] };
		}
	}

	function saveStoredData(data) {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
	}

	function getCounter() {
		const n = parseInt(localStorage.getItem(COUNTER_KEY));
		return isNaN(n) ? 0 : n;
	}

	function setCounter(n) {
		localStorage.setItem(COUNTER_KEY, String(n));
	}

	// Seed storage from existing HTML tables if storage is empty
	function seedFromHTMLIfNeeded() {
		const data = getStoredData();
		if (data.electronics.length || data.furniture.length || data.stationery.length) return;

		const types = ['electronics', 'furniture', 'stationery'];
		let maxId = 0;
		types.forEach(type => {
			const table = document.getElementById(type + '-table');
			if (!table) return;
			// rows: skip header
			for (let i = 1; i < table.rows.length; i++) {
				const cells = table.rows[i].cells;
				if (!cells || cells.length < 4) continue;
				const id = parseInt(cells[0].textContent) || 0;
				const name = cells[1].textContent || '';
				const qty = cells[2].textContent || '';
				const cond = cells[3].textContent || '';
				data[type].push({ id, name, qty, cond });
				if (id > maxId) maxId = id;
			}
		});
		saveStoredData(data);
		setCounter(maxId);
	}

	function renderTables() {
		const data = getStoredData();
		const types = ['electronics', 'furniture', 'stationery'];
		types.forEach(type => {
			const table = document.getElementById(type + '-table');
			if (!table) return;
			// clear rows and re-render header + rows
			table.innerHTML = '';
			const header = table.insertRow(-1);
			header.innerHTML = '<th>ID</th><th>Asset Name</th><th>Quantity</th><th>Condition</th><th>Action</th>';
			data[type].forEach(item => {
				const row = table.insertRow(-1);
				row.innerHTML = `<td>${item.id}</td><td>${escapeHtml(item.name)}</td><td>${escapeHtml(String(item.qty))}</td><td>${escapeHtml(item.cond)}</td><td><button type="button" class="delete-btn" data-id="${item.id}" data-type="${type}">Delete</button></td>`;
			});
		});

		// If admin table exists, render combined view
		const adminTable = document.querySelector('table');
		// Heuristic: admin page has a table with 'Department' header; detect by checking for an element with text 'Department' in the first header row
		if (adminTable && document.body.innerText.includes('Admin Dashboard')) {
			// find the specific admin table (first table on page)
			const table = adminTable;
			// clear and render header
			table.innerHTML = '';
			const header = table.insertRow(-1);
			header.innerHTML = '<th>ID</th><th>Department</th><th>Asset Name</th><th>Quantity</th><th>Condition</th><th>Action</th>';
			const all = [];
			['electronics', 'furniture', 'stationery'].forEach(type => {
				getStoredData()[type].forEach(item => all.push({ type, ...item }));
			});
			all.sort((a, b) => a.id - b.id);
			all.forEach(item => {
				const row = table.insertRow(-1);
				row.innerHTML = `<td>${item.id}</td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.name)}</td><td>${escapeHtml(String(item.qty))}</td><td>${escapeHtml(item.cond)}</td><td><button type="button" class="delete-btn" data-id="${item.id}" data-type="${item.type}">Delete</button></td>`;
			});
		}
	}

	function escapeHtml(str) {
		return String(str).replace(/[&<>\"]/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; });
	}

	function addAsset(type, name, qty, cond) {
		const data = getStoredData();
		const counter = getCounter();
		const id = counter + 1;
		data[type].push({ id, name, qty, cond });
		saveStoredData(data);
		setCounter(id);
		renderTables();
	}

	function deleteAsset(type, id) {
		const data = getStoredData();
		data[type] = data[type].filter(item => item.id !== id);
		saveStoredData(data);
		renderTables();
	}

	// Initialize
	seedFromHTMLIfNeeded();
	renderTables();

	// Wire up add asset form - only admin can add
	const assetForm = document.querySelector('.asset-form');
	function currentRole() { return sessionStorage.getItem('role') || '' }
	if (assetForm) {
		assetForm.addEventListener('submit', function (e) {
			e.preventDefault();
			const role = currentRole();
			if (role !== 'admin') { alert('Only admin can add assets'); return; }
			const type = document.getElementById('asset-type').value;
			const name = document.getElementById('asset-name').value.trim();
			const qty = document.getElementById('asset-qty').value;
			const cond = document.getElementById('asset-cond').value.trim();
			if (!type || !name || !qty || !cond) return;
			addAsset(type, name, qty, cond);
			assetForm.reset();
		});
	}

	// Wire up indent form (no persistence required)
	const indentForm = document.querySelector('.indent-form');
	if (indentForm) {
		// default date to today
		const dateInput = document.getElementById('indent-date');
		if (dateInput && !dateInput.value) {
			const today = new Date().toISOString().slice(0, 10);
			dateInput.value = today;
		}

		const tbody = document.querySelector('#indent-table tbody');
		const addRowBtn = document.getElementById('add-indent-row');

		function refreshSerials() {
			Array.from(tbody.querySelectorAll('tr')).forEach((tr, idx) => {
				const snCell = tr.querySelector('.sn');
				if (snCell) snCell.textContent = idx + 1;
			});
		}

		function addIndentRow(particulars = '', orderedBy = '') {
			const tr = document.createElement('tr');
			tr.innerHTML = `<td class="sn"></td><td><input type="text" class="particulars" value="${escapeHtml(particulars)}" required></td><td><input type="text" class="orderedBy" value="${escapeHtml(orderedBy)}" required></td><td><button type="button" class="remove-indent-row">Remove</button></td>`;
			tbody.appendChild(tr);
			refreshSerials();
		}

		addRowBtn.addEventListener('click', function () { addIndentRow(); });

		// allow removing rows
		tbody.addEventListener('click', function (e) {
			if (e.target.classList.contains('remove-indent-row')) {
				e.target.closest('tr').remove();
				refreshSerials();
			}
		});

		indentForm.addEventListener('submit', function (e) {
			e.preventDefault();
			// gather data
			const date = document.getElementById('indent-date').value;
			const billNo = document.getElementById('bill-no').value;
			const passedBy = document.getElementById('passed-by').value;
			const rows = Array.from(tbody.querySelectorAll('tr')).map(tr => ({
				sn: tr.querySelector('.sn').textContent,
				particulars: tr.querySelector('.particulars').value,
				orderedBy: tr.querySelector('.orderedBy').value
			}));
			// For now just show a confirmation and reset
			alert('Indent Submitted\nDate: ' + date + '\nBill No: ' + billNo + '\nPassed By: ' + passedBy + '\nRows: ' + JSON.stringify(rows, null, 2));
			// reset table
			tbody.innerHTML = '';
			refreshSerials();
			indentForm.reset();
			// re-set date to today
			if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
		});
	}

	// Global click handler for delete buttons (admin only)
	document.body.addEventListener('click', function (e) {
		const target = e.target;
		if (target.classList.contains('delete-btn')) {
			const role = currentRole();
			if (role !== 'admin') { alert('Only admin can delete assets'); return; }
			const id = parseInt(target.getAttribute('data-id'));
			const type = target.getAttribute('data-type');
			if (!isNaN(id) && type) {
				// Confirm deletion
				if (confirm('Delete this asset?')) {
					deleteAsset(type, id);
				}
			}
		}
	});

	// Protect admin page: if user not admin, redirect away
	if (document.body.innerText.includes('Admin Dashboard')) {
		if (currentRole() !== 'admin') {
			alert('Admin access required');
			window.location.href = 'index.html';
		}
	}
});