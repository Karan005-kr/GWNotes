const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { authenticateAdmin } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validation.middleware');
const { uploadMaterialFile } = require('../middleware/upload.middleware');
const s = require('../validators/schemas');
const c = require('../controllers/admin.controller');
const superadmin = require('../controllers/superadmin.controller');

router.use(authenticateAdmin);

// Dashboard is available to both roles. UPLOADER receives own-upload material stats.
router.get('/dashboard', asyncHandler(c.dashboard));

// Academic lists are readable by both roles because uploaders need them to place material.
router.get('/universities', asyncHandler(c.listUniversities));
router.get('/courses', asyncHandler(c.listCourses));
router.get('/university-courses', asyncHandler(c.listUniversityCourses));
router.get('/specializations', asyncHandler(c.listSpecializations));
router.get('/subjects', asyncHandler(c.listSubjects));

// Academic structure changes are SUPER_ADMIN only.
router.post('/universities', requireRole('SUPER_ADMIN'), validate(s.universitySchema), asyncHandler(c.createUniversity));
router.put('/universities/:id', requireRole('SUPER_ADMIN'), validate(s.universitySchema), asyncHandler(c.updateUniversity));
router.patch('/universities/:id/status', requireRole('SUPER_ADMIN'), validate(s.statusSchema), asyncHandler(c.setUniversityStatus));
router.delete('/universities/:id', requireRole('SUPER_ADMIN'), asyncHandler(c.deleteUniversity));

router.post('/courses', requireRole('SUPER_ADMIN'), validate(s.courseSchema), asyncHandler(c.createCourse));
router.put('/courses/:id', requireRole('SUPER_ADMIN'), validate(s.courseSchema), asyncHandler(c.updateCourse));
router.patch('/courses/:id/status', requireRole('SUPER_ADMIN'), validate(s.statusSchema), asyncHandler(c.setCourseStatus));
router.delete('/courses/:id', requireRole('SUPER_ADMIN'), asyncHandler(c.deleteCourse));

router.post('/university-courses', requireRole('SUPER_ADMIN'), validate(s.universityCourseSchema), asyncHandler(c.createUniversityCourse));
router.put('/university-courses/:id', requireRole('SUPER_ADMIN'), validate(s.universityCourseSchema), asyncHandler(c.updateUniversityCourse));
router.delete('/university-courses/:id', requireRole('SUPER_ADMIN'), asyncHandler(c.deleteUniversityCourse));

router.post('/specializations', requireRole('SUPER_ADMIN'), validate(s.specializationSchema), asyncHandler(c.createSpecialization));
router.put('/specializations/:id', requireRole('SUPER_ADMIN'), validate(s.specializationSchema), asyncHandler(c.updateSpecialization));
router.delete('/specializations/:id', requireRole('SUPER_ADMIN'), asyncHandler(c.deleteSpecialization));

router.post('/subjects', requireRole('SUPER_ADMIN'), validate(s.subjectSchema), asyncHandler(c.createSubject));
router.put('/subjects/:id', requireRole('SUPER_ADMIN'), validate(s.subjectSchema), asyncHandler(c.updateSubject));
router.patch('/subjects/:id/status', requireRole('SUPER_ADMIN'), validate(s.statusSchema), asyncHandler(c.setSubjectStatus));
router.delete('/subjects/:id', requireRole('SUPER_ADMIN'), asyncHandler(c.deleteSubject));

// Materials: both roles can add/list. Uploader-created material is forced unpublished.
router.get('/materials', asyncHandler(c.listMaterials));
router.post('/materials', validate(s.materialSchema), asyncHandler(c.createMaterial));
router.post('/materials/upload', uploadMaterialFile, asyncHandler(c.uploadMaterial));

// Review/edit/publish/delete is SUPER_ADMIN only.
router.put('/materials/:id', requireRole('SUPER_ADMIN'), validate(s.materialSchema), asyncHandler(c.updateMaterial));
router.patch('/materials/:id/publish', requireRole('SUPER_ADMIN'), asyncHandler(c.publishMaterial));
router.patch('/materials/:id/unpublish', requireRole('SUPER_ADMIN'), asyncHandler(c.unpublishMaterial));
router.delete('/materials/:id', requireRole('SUPER_ADMIN'), asyncHandler(c.deleteMaterial));

// SUPER_ADMIN user management and monitoring.
router.get('/uploaders', requireRole('SUPER_ADMIN'), asyncHandler(superadmin.listUploaders));
router.post('/uploaders', requireRole('SUPER_ADMIN'), validate(s.uploaderSchema), asyncHandler(superadmin.createUploader));
router.patch('/uploaders/:id/status', requireRole('SUPER_ADMIN'), validate(s.statusSchema), asyncHandler(superadmin.setUploaderStatus));
router.get('/audit-logs', requireRole('SUPER_ADMIN'), asyncHandler(superadmin.listAuditLogs));
router.get('/login-history', requireRole('SUPER_ADMIN'), asyncHandler(superadmin.listLoginHistory));

module.exports = router;
