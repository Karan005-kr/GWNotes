(function () {
  const API = window.StudyVaultAPI;
  const $ = (id) => document.getElementById(id);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[ch]));
  const toast = (message, error) => window.studyVaultToast(message, error);

  const cache = { universities: [], courses: [] };
  let currentAdmin = null;

  function setMessage(id, message, ok = false) {
    const el = $(id);
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('success', ok);
  }

  function optionHtml(items, valueKey, labelFn) {
    return '<option value="">Select</option>' + items
      .map((item) => `<option value="${esc(item[valueKey])}">${esc(labelFn(item))}</option>`)
      .join('');
  }

  function token() {
    return localStorage.getItem('studyvault_admin_token');
  }

  function isSuperAdmin() {
    return currentAdmin?.role === 'SUPER_ADMIN';
  }

  function applyRoleUI() {
    const superAdmin = isSuperAdmin();
    $$('.super-admin-only').forEach((el) => { el.hidden = !superAdmin; });

    if ($('publishImmediatelyWrap')) $('publishImmediatelyWrap').hidden = !superAdmin;
    if ($('materialPublished') && !superAdmin) $('materialPublished').checked = false;

    const materialsButton = document.querySelector('[data-admin-tab="materials"]');
    if (materialsButton) materialsButton.textContent = superAdmin ? 'Manage Materials' : 'My Uploads';

    const dashboardHeading = $('adminDashboardTab')?.querySelector('h2');
    if (dashboardHeading) dashboardHeading.textContent = superAdmin ? 'Dashboard' : 'Uploader Dashboard';
  }

  function activateTab(name) {
    $$('.admin-nav[data-admin-tab]').forEach((button) => {
      button.classList.toggle('active', button.dataset.adminTab === name);
    });
    $$('.admin-tab').forEach((tab) => tab.classList.remove('active'));
    const tab = $(`admin${name[0].toUpperCase()}${name.slice(1)}Tab`);
    if (tab) tab.classList.add('active');
  }

  async function open() {
    if (!token()) {
      $('adminLoginPanel').hidden = false;
      $('adminPanel').hidden = true;
      return;
    }

    try {
      const me = await API.me();
      currentAdmin = me.data;
      $('adminLoginPanel').hidden = true;
      $('adminPanel').hidden = false;
      $('adminName').textContent = currentAdmin.name || currentAdmin.email || 'Administrator';
      $('adminRole').textContent = currentAdmin.role || 'ADMIN';
      applyRoleUI();
      activateTab('dashboard');
      await Promise.all([loadBaseOptions(), loadDashboard()]);
    } catch (_error) {
      currentAdmin = null;
      localStorage.removeItem('studyvault_admin_token');
      $('adminLoginPanel').hidden = false;
      $('adminPanel').hidden = true;
    }
  }

  $('adminLoginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage('loginMessage', 'Signing in...');
    try {
      const result = await API.login($('adminEmail').value.trim(), $('adminPassword').value);
      localStorage.setItem('studyvault_admin_token', result.data.token);
      setMessage('loginMessage', 'Login successful.', true);
      await open();
    } catch (error) {
      setMessage('loginMessage', error.message);
    }
  });

  $('adminLogout').addEventListener('click', async () => {
    try { await API.logout(); } catch (_error) {}
    currentAdmin = null;
    localStorage.removeItem('studyvault_admin_token');
    $('adminPanel').hidden = true;
    $('adminLoginPanel').hidden = false;
    $('adminPassword').value = '';
    setMessage('loginMessage', '');
  });

  $$('.admin-nav[data-admin-tab]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (button.hidden) return;
      const name = button.dataset.adminTab;
      activateTab(name);
      if (name === 'dashboard') await loadDashboard();
      if (name === 'materials') await loadMaterials();
      if (name === 'subjects') await refreshAdminSubjectList();
      if (name === 'uploaders') await loadUploaders();
      if (name === 'activity') await loadActivity();
    });
  });

  async function loadBaseOptions() {
    const [universities, courses] = await Promise.all([API.getUniversities(), API.getCourses()]);
    cache.universities = universities.data || [];
    cache.courses = courses.data || [];

    ['uploadUniversity', 'subjectUniversity', 'mapUniversity', 'branchUniversity'].forEach((id) => {
      if ($(id)) $(id).innerHTML = optionHtml(cache.universities, 'id', (u) => `${u.short_name || u.name} — ${u.name}`);
    });
    if ($('mapCourse')) {
      $('mapCourse').innerHTML = optionHtml(cache.courses, 'id', (c) => `${c.short_name || c.name} — ${c.name}`);
    }
  }

  async function populateUniversityCourses(universitySelectId, courseSelectId) {
    const uid = $(universitySelectId).value;
    if (!uid) {
      $(courseSelectId).innerHTML = '<option value="">Select</option>';
      return;
    }
    const result = await API.getUniversityCourses(uid);
    $(courseSelectId).innerHTML = optionHtml(
      result.data || [],
      'university_course_id',
      (course) => `${course.short_name || course.name} — ${course.name}`
    );
  }

  async function populateCourseChildren(courseSelectId, specializationId, semesterId) {
    const universityCourseId = $(courseSelectId).value;
    if (!universityCourseId) return;

    const [specializations, semesters] = await Promise.all([
      API.getSpecializations(universityCourseId),
      API.getSemesters(universityCourseId),
    ]);

    $(specializationId).innerHTML = '<option value="">Common / No branch</option>' +
      (specializations.data || []).map((item) =>
        `<option value="${item.id}">${esc(item.short_name || item.name)} — ${esc(item.name)}</option>`
      ).join('');
    $(semesterId).innerHTML = optionHtml(semesters.data || [], 'number', (item) => item.label);
  }

  async function populateSubjects(courseId, specializationId, semesterId, subjectId) {
    const universityCourseId = $(courseId).value;
    const semester = $(semesterId).value;
    if (!universityCourseId || !semester) {
      $(subjectId).innerHTML = '<option value="">Select</option>';
      return [];
    }

    const result = await API.getSubjects(
      universityCourseId,
      semester,
      $(specializationId).value || null
    );
    $(subjectId).innerHTML = optionHtml(
      result.data || [],
      'id',
      (subject) => `${subject.subject_code || ''} — ${subject.name}`
    );
    return result.data || [];
  }

  [
    ['uploadUniversity', 'uploadCourse'],
    ['subjectUniversity', 'subjectCourse'],
    ['branchUniversity', 'branchCourse'],
  ].forEach(([universityId, courseId]) => {
    $(universityId).addEventListener('change', async () => {
      await populateUniversityCourses(universityId, courseId);
      if (universityId === 'branchUniversity') return;
      const prefix = universityId === 'uploadUniversity' ? 'upload' : 'subject';
      $(`${prefix}Specialization`).innerHTML = '<option value="">Common / No branch</option>';
      $(`${prefix}Semester`).innerHTML = '<option value="">Select</option>';
      if ($(`${prefix}Subject`)) $(`${prefix}Subject`).innerHTML = '<option value="">Select</option>';
    });
  });

  $('uploadCourse').addEventListener('change', () => populateCourseChildren('uploadCourse', 'uploadSpecialization', 'uploadSemester'));
  $('subjectCourse').addEventListener('change', () => populateCourseChildren('subjectCourse', 'subjectSpecialization', 'subjectSemester'));
  $('uploadSemester').addEventListener('change', () => populateSubjects('uploadCourse', 'uploadSpecialization', 'uploadSemester', 'uploadSubject'));
  $('uploadSpecialization').addEventListener('change', () => populateSubjects('uploadCourse', 'uploadSpecialization', 'uploadSemester', 'uploadSubject'));
  $('subjectSemester').addEventListener('change', refreshAdminSubjectList);
  $('subjectSpecialization').addEventListener('change', refreshAdminSubjectList);

  async function loadDashboard() {
    try {
      const result = await API.adminDashboard();
      const data = result.data || {};
      const materialLabel = isSuperAdmin() ? 'Materials' : 'My Materials';
      const statMap = [
        ['Universities', data.totalUniversities ?? data.total_universities ?? 0],
        ['Courses', data.totalCourses ?? data.total_courses ?? 0],
        ['Subjects', data.totalSubjects ?? data.total_subjects ?? 0],
        [materialLabel, data.totalMaterials ?? data.total_materials ?? 0],
        ['Published', data.publishedMaterials ?? data.published_materials ?? 0],
        ['Syllabus', data.syllabusCount ?? data.syllabus_count ?? 0],
        ['Notes', data.notesCount ?? data.notes_count ?? 0],
        ['PYQ', data.pyqCount ?? data.pyq_count ?? 0],
      ];
      $('adminStats').innerHTML = statMap.map(([label, value]) =>
        `<article class="admin-stat"><strong>${esc(value)}</strong><span>${esc(label)}</span></article>`
      ).join('');

      const recent = data.recentMaterials || data.recent_materials || [];
      $('recentMaterials').innerHTML = recent.length
        ? tableForMaterials(recent, false)
        : '<div class="empty-state"><strong>No recent material</strong><p>New material will appear here.</p></div>';
    } catch (error) {
      toast(error.message, true);
    }
  }
  $('refreshDashboard').addEventListener('click', loadDashboard);

  $('materialType').addEventListener('change', () => {
    const type = $('materialType').value;
    $('unitField').hidden = type !== 'NOTES';
    $('yearField').hidden = type !== 'PYQ';
  });

  $$('input[name="materialMethod"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      const upload = document.querySelector('input[name="materialMethod"]:checked').value === 'upload';
      $('fileInputWrap').hidden = !upload;
      $('urlInputWrap').hidden = upload;
    });
  });

  $('materialUploadForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage('uploadMessage', 'Saving...');

    const subjectId = Number($('uploadSubject').value);
    if (!subjectId) {
      setMessage('uploadMessage', 'Please select a subject first.');
      return;
    }

    const metadata = {
      subject_id: subjectId,
      title: $('materialTitle').value.trim(),
      description: $('materialDescription').value.trim(),
      material_type: $('materialType').value,
      unit_number: $('materialType').value === 'NOTES' && $('materialUnit').value ? Number($('materialUnit').value) : null,
      exam_year: $('materialType').value === 'PYQ' && $('materialYear').value ? Number($('materialYear').value) : null,
      is_published: isSuperAdmin() && $('materialPublished').checked,
      display_order: 0,
    };

    try {
      const method = document.querySelector('input[name="materialMethod"]:checked').value;
      let response;

      if (method === 'upload') {
        const file = $('materialFile').files[0];
        if (!file) throw new Error('Select a document file.');
        const form = new FormData();
        form.append('file', file);
        form.append('metadata', JSON.stringify(metadata));
        response = await API.uploadMaterial(form);
      } else {
        const value = $('materialUrl').value.trim();
        if (!value) throw new Error('Enter a file URL or path.');
        if (/^https?:\/\//i.test(value)) metadata.file_url = value;
        else metadata.file_path = value;
        response = await API.createMaterial(metadata);
      }

      setMessage('uploadMessage', response.message || 'Material saved successfully.', true);
      toast(response.message || 'Material saved.');
      $('materialTitle').value = '';
      $('materialDescription').value = '';
      $('materialFile').value = '';
      $('materialUrl').value = '';
      $('materialUnit').value = '';
      $('materialYear').value = '';
      await loadDashboard();
    } catch (error) {
      setMessage('uploadMessage', error.message);
    }
  });

  async function loadMaterials() {
    const params = new URLSearchParams({ page: '1', limit: '50' });
    if ($('materialSearch').value.trim()) params.set('search', $('materialSearch').value.trim());
    if ($('materialFilterType').value) params.set('type', $('materialFilterType').value);
    if ($('materialFilterPublished').value) params.set('published', $('materialFilterPublished').value);

    $('adminMaterialsTable').innerHTML = '<div class="loading">Loading...</div>';
    try {
      const result = await API.adminMaterials(params.toString());
      $('adminMaterialsTable').innerHTML = tableForMaterials(result.data, isSuperAdmin());
    } catch (error) {
      $('adminMaterialsTable').innerHTML = `<div class="empty-state"><strong>Could not load materials</strong><p>${esc(error.message)}</p></div>`;
    }
  }
  $('refreshMaterials').addEventListener('click', loadMaterials);
  $('applyMaterialFilters').addEventListener('click', loadMaterials);

  function tableForMaterials(rows, actions) {
    if (!rows?.length) {
      return '<div class="empty-state"><strong>No materials found</strong><p>Try another filter or add a new material.</p></div>';
    }

    const showUploader = isSuperAdmin() && rows.some((row) => row.uploader_name || row.uploader_email);
    return `<table><thead><tr>
      <th>Title</th><th>Subject</th><th>Type</th><th>Status</th>
      ${showUploader ? '<th>Uploaded By</th>' : ''}
      ${actions ? '<th>Actions</th>' : ''}
    </tr></thead><tbody>${rows.map((material) => `<tr>
      <td>${esc(material.title)}</td>
      <td>${esc(material.subject_name || '')}<br><small>${esc(material.subject_code || '')}</small></td>
      <td>${esc(material.material_type)}</td>
      <td><span class="status ${material.is_published ? 'published' : 'unpublished'}">${material.is_published ? 'Published' : 'Pending / Hidden'}</span></td>
      ${showUploader ? `<td>${esc(material.uploader_name || '')}<br><small>${esc(material.uploader_email || '')}</small></td>` : ''}
      ${actions ? `<td><div class="table-actions">
        <button class="table-btn" data-material-action="${material.is_published ? 'unpublish' : 'publish'}" data-id="${material.id}">${material.is_published ? 'Hide' : 'Publish'}</button>
        <button class="table-btn" data-material-action="delete" data-id="${material.id}">Delete</button>
      </div></td>` : ''}
    </tr>`).join('')}</tbody></table>`;
  }

  $('adminMaterialsTable').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-material-action]');
    if (!button || !isSuperAdmin()) return;

    const materialId = Number(button.dataset.id);
    const action = button.dataset.materialAction;
    try {
      if (action === 'delete') {
        if (!confirm('Delete this material?')) return;
        await API.deleteMaterial(materialId);
      } else if (action === 'publish') {
        await API.publishMaterial(materialId);
      } else {
        await API.unpublishMaterial(materialId);
      }
      toast('Material updated.');
      await Promise.all([loadMaterials(), loadDashboard()]);
    } catch (error) {
      toast(error.message, true);
    }
  });

  async function refreshAdminSubjectList() {
    if (!isSuperAdmin()) return;
    const universityCourseId = $('subjectCourse').value;
    const semester = $('subjectSemester').value;
    if (!universityCourseId || !semester) {
      $('adminSubjectList').innerHTML = '<div class="empty-state"><strong>Select course and semester</strong><p>Subjects will appear here.</p></div>';
      return;
    }

    try {
      const result = await API.getSubjects(universityCourseId, semester, $('subjectSpecialization').value || null);
      $('adminSubjectList').innerHTML = result.data.length
        ? result.data.map((subject) => `<article class="subject-card"><div><h3>${esc(subject.name)}</h3><p>${esc(subject.subject_code || '')}</p></div><span class="status published">Active</span></article>`).join('')
        : '<div class="empty-state"><strong>No subjects</strong><p>Add the first subject using the form above.</p></div>';
    } catch (error) {
      $('adminSubjectList').innerHTML = `<div class="empty-state"><strong>Could not load subjects</strong><p>${esc(error.message)}</p></div>`;
    }
  }

  $('subjectCreateForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!isSuperAdmin()) return;
    setMessage('subjectMessage', 'Saving...');
    try {
      await API.createSubject({
        university_course_id: Number($('subjectCourse').value),
        specialization_id: $('subjectSpecialization').value ? Number($('subjectSpecialization').value) : null,
        semester_number: Number($('subjectSemester').value),
        name: $('newSubjectName').value.trim(),
        subject_code: $('newSubjectCode').value.trim(),
        description: $('newSubjectDescription').value.trim(),
        is_active: true,
        display_order: 0,
      });
      setMessage('subjectMessage', 'Subject added.', true);
      $('newSubjectName').value = '';
      $('newSubjectCode').value = '';
      $('newSubjectDescription').value = '';
      await refreshAdminSubjectList();
    } catch (error) {
      setMessage('subjectMessage', error.message);
    }
  });

  $('universityCreateForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!isSuperAdmin()) return;
    setMessage('universityMessage', 'Saving...');
    try {
      await API.createUniversity({
        name: $('newUniversityName').value.trim(),
        short_name: $('newUniversityShort').value.trim(),
        location: $('newUniversityLocation').value.trim() || null,
        website: null,
        is_active: true,
      });
      setMessage('universityMessage', 'University added.', true);
      await loadBaseOptions();
    } catch (error) {
      setMessage('universityMessage', error.message);
    }
  });

  $('courseCreateForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!isSuperAdmin()) return;
    setMessage('courseMessage', 'Saving...');
    try {
      await API.createCourse({
        name: $('newCourseName').value.trim(),
        short_name: $('newCourseShort').value.trim(),
        default_semesters: Number($('newCourseSemesters').value),
        is_active: true,
      });
      setMessage('courseMessage', 'Course added.', true);
      await loadBaseOptions();
    } catch (error) {
      setMessage('courseMessage', error.message);
    }
  });

  $('mappingCreateForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!isSuperAdmin()) return;
    setMessage('mappingMessage', 'Saving...');
    try {
      await API.createMapping({
        university_id: Number($('mapUniversity').value),
        course_id: Number($('mapCourse').value),
        total_semesters: Number($('mapSemesters').value),
        is_active: true,
      });
      setMessage('mappingMessage', 'Mapping created.', true);
    } catch (error) {
      setMessage('mappingMessage', error.message);
    }
  });

  $('specializationCreateForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!isSuperAdmin()) return;
    setMessage('branchMessage', 'Saving...');
    try {
      await API.createSpecialization({
        university_course_id: Number($('branchCourse').value),
        name: $('branchName').value.trim(),
        short_name: $('branchShort').value.trim(),
        is_active: true,
      });
      setMessage('branchMessage', 'Branch added.', true);
    } catch (error) {
      setMessage('branchMessage', error.message);
    }
  });

  async function loadUploaders() {
    if (!isSuperAdmin()) return;
    $('uploadersTable').innerHTML = '<div class="loading">Loading...</div>';
    try {
      const result = await API.adminUploaders();
      const rows = result.data || [];
      $('uploadersTable').innerHTML = rows.length ? `<table><thead><tr>
        <th>Name</th><th>Email</th><th>Status</th><th>Last Login</th><th>Action</th>
      </tr></thead><tbody>${rows.map((uploader) => `<tr>
        <td>${esc(uploader.name)}</td>
        <td>${esc(uploader.email)}</td>
        <td><span class="status ${uploader.is_active ? 'published' : 'unpublished'}">${uploader.is_active ? 'Active' : 'Disabled'}</span></td>
        <td>${esc(uploader.last_login_at ? new Date(uploader.last_login_at).toLocaleString() : 'Never')}</td>
        <td><button class="table-btn" data-uploader-status="${uploader.is_active ? '0' : '1'}" data-id="${uploader.id}">${uploader.is_active ? 'Disable' : 'Enable'}</button></td>
      </tr>`).join('')}</tbody></table>` : '<div class="empty-state"><strong>No uploader accounts</strong><p>Create the first uploader above.</p></div>';
    } catch (error) {
      $('uploadersTable').innerHTML = `<div class="empty-state"><strong>Could not load uploaders</strong><p>${esc(error.message)}</p></div>`;
    }
  }

  $('uploaderCreateForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!isSuperAdmin()) return;
    setMessage('uploaderMessage', 'Creating...');
    try {
      await API.createUploader({
        name: $('uploaderName').value.trim(),
        email: $('uploaderEmail').value.trim(),
        password: $('uploaderPassword').value,
      });
      setMessage('uploaderMessage', 'Uploader created successfully.', true);
      $('uploaderName').value = '';
      $('uploaderEmail').value = '';
      $('uploaderPassword').value = '';
      await loadUploaders();
    } catch (error) {
      setMessage('uploaderMessage', error.message);
    }
  });

  $('refreshUploaders').addEventListener('click', loadUploaders);
  $('uploadersTable').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-uploader-status]');
    if (!button || !isSuperAdmin()) return;
    try {
      await API.setUploaderStatus(Number(button.dataset.id), button.dataset.uploaderStatus === '1');
      toast('Uploader status updated.');
      await loadUploaders();
    } catch (error) {
      toast(error.message, true);
    }
  });

  function activityTable(rows) {
    if (!rows.length) return '<div class="empty-state"><strong>No activity yet</strong></div>';
    return `<table><thead><tr><th>Admin</th><th>Action</th><th>Entity</th><th>Time</th></tr></thead><tbody>${rows.map((row) => `<tr>
      <td>${esc(row.admin_name || row.admin_email || 'Unknown')}<br><small>${esc(row.admin_role || '')}</small></td>
      <td>${esc(row.action)}</td>
      <td>${esc(row.entity_type || '')}${row.entity_id ? ` #${esc(row.entity_id)}` : ''}</td>
      <td>${esc(row.created_at ? new Date(row.created_at).toLocaleString() : '')}</td>
    </tr>`).join('')}</tbody></table>`;
  }

  function loginTable(rows) {
    if (!rows.length) return '<div class="empty-state"><strong>No login history yet</strong></div>';
    return `<table><thead><tr><th>Account</th><th>Status</th><th>Login</th><th>Logout</th><th>IP</th></tr></thead><tbody>${rows.map((row) => `<tr>
      <td>${esc(row.admin_name || row.attempted_email || row.admin_email || 'Unknown')}<br><small>${esc(row.admin_email || row.attempted_email || '')}</small></td>
      <td><span class="status ${row.status === 'SUCCESS' ? 'published' : 'unpublished'}">${esc(row.status)}</span></td>
      <td>${esc(row.login_time ? new Date(row.login_time).toLocaleString() : '')}</td>
      <td>${esc(row.logout_time ? new Date(row.logout_time).toLocaleString() : '—')}</td>
      <td>${esc(row.ip_address || '—')}</td>
    </tr>`).join('')}</tbody></table>`;
  }

  async function loadActivity() {
    if (!isSuperAdmin()) return;
    $('activityLogsTable').innerHTML = '<div class="loading">Loading...</div>';
    $('loginHistoryTable').innerHTML = '<div class="loading">Loading...</div>';
    try {
      const [activity, logins] = await Promise.all([API.auditLogs(100), API.loginHistory(100)]);
      $('activityLogsTable').innerHTML = activityTable(activity.data || []);
      $('loginHistoryTable').innerHTML = loginTable(logins.data || []);
    } catch (error) {
      $('activityLogsTable').innerHTML = `<div class="empty-state"><strong>Could not load activity</strong><p>${esc(error.message)}</p></div>`;
      $('loginHistoryTable').innerHTML = '';
    }
  }
  $('refreshActivity').addEventListener('click', loadActivity);

  window.StudyVaultAdmin = {
    open,
    loadDashboard,
    loadMaterials,
    loadUploaders,
    loadActivity,
  };

  // Keep dashboard numbers live while the admin panel is open.
  // It only refreshes when the Dashboard tab is currently visible.
  setInterval(() => {
    if (!currentAdmin || !token()) return;

    const dashboardTab = $('adminDashboardTab');
    if (dashboardTab && dashboardTab.classList.contains('active')) {
      loadDashboard().catch(() => {});
    }
  }, 15000);

})();
