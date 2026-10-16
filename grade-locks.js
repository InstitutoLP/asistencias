const normalizeGradeValue = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : String(value);
};

const valuesMatch = (property, incoming, current) => property === 'earnedPointsManual'
  ? Boolean(incoming) === Boolean(current)
  : normalizeGradeValue(incoming) === normalizeGradeValue(current);

const getAssessmentEntries = (grades) => {
  const entries = new Map();
  Object.entries(grades || {}).forEach(([subjectId, subjectGrades]) => {
    Object.entries(subjectGrades?.assessments || {}).forEach(([period, activities]) => {
      if (!Array.isArray(activities)) return;
      activities.forEach((activity) => {
        if (activity?.id === undefined || activity?.id === null) return;
        entries.set(`${subjectId}\u0000${period}\u0000${String(activity.id)}`, activity);
      });
    });
  });
  return entries;
};

const getRoundedAssessmentGrade = (assessments) => {
  let total = 0;
  let hasScore = false;
  assessments.forEach((activity) => {
    const points = activity?.earnedPoints;
    if (points === null || points === undefined || points === '' || !Number.isFinite(Number(points))) return;
    total += Number(points);
    hasScore = true;
  });
  return hasScore ? Math.round(Number(total.toFixed(2))) : null;
};

const validateGradeLockUpdate = (cohort, studentId, incomingGrades, isLockManager) => {
  const target = cohort.find((student) => String(student.id) === String(studentId));
  const currentEntries = getAssessmentEntries(target?.grades);
  const protectedGrades = JSON.parse(JSON.stringify(incomingGrades || {}));
  const incomingEntries = getAssessmentEntries(protectedGrades);
  const cohortEntries = new Map();
  cohort.forEach((student) => {
    getAssessmentEntries(student.grades).forEach((activity, key) => {
      if (activity.locked === true) cohortEntries.set(key, activity);
    });
  });

  for (const [key, lockedActivity] of cohortEntries) {
    const currentActivity = currentEntries.get(key);
    if (!currentActivity || isLockManager) continue;
    if (!incomingEntries.has(key)) {
      const [subjectId, period] = key.split('\u0000');
      const subjectGrades = protectedGrades[subjectId] || (protectedGrades[subjectId] = {});
      const assessments = subjectGrades.assessments || (subjectGrades.assessments = {});
      const periodEntries = Array.isArray(assessments[period]) ? assessments[period] : [];
      assessments[period] = [...periodEntries, currentActivity];
      incomingEntries.set(key, currentActivity);
    }
  }

  for (const [key, activity] of incomingEntries) {
    const current = currentEntries.get(key);
    const cohortLock = cohortEntries.get(key);
    const incomingHasLock = Object.prototype.hasOwnProperty.call(activity, 'locked');
    if (!isLockManager && incomingHasLock && Boolean(activity.locked) !== Boolean(current?.locked)) {
      if (activity.locked === true && cohortLock) {
        activity.locked = true;
      } else {
        return { grades: protectedGrades, error: 'Solo Andy puede bloquear o desbloquear columnas de notas.' };
      }
    }

    if (!isLockManager && cohortLock) {
      for (const property of ['score', 'earnedPoints', 'earnedPointsManual', 'name', 'weight']) {
        if (!Object.prototype.hasOwnProperty.call(activity, property)) {
          if (current && Object.prototype.hasOwnProperty.call(current, property)) activity[property] = current[property];
          continue;
        }
        const baseline = property === 'name' || property === 'weight'
          ? cohortLock[property]
          : current?.[property];
        if (!valuesMatch(property, activity[property], baseline)) {
          return { grades: protectedGrades, error: 'Esta columna está bloqueada por Andy y no se pueden modificar sus notas.' };
        }
      }
      activity.locked = true;
    } else if (!isLockManager && activity.locked === true) {
      return { grades: protectedGrades, error: 'Solo Andy puede bloquear o desbloquear columnas de notas.' };
    }
  }

  if (!isLockManager) {
    const affectedPeriods = new Set(
      [...cohortEntries.keys()].map((key) => key.split('\u0000').slice(0, 2).join('\u0000')),
    );
    affectedPeriods.forEach((key) => {
      const [subjectId, period] = key.split('\u0000');
      const subjectGrades = protectedGrades[subjectId] || (protectedGrades[subjectId] = {});
      const assessments = subjectGrades.assessments?.[period];
      if (Array.isArray(assessments)) {
        subjectGrades[period] = getRoundedAssessmentGrade(assessments);
      } else {
        const currentSubjectGrades = target?.grades?.[subjectId];
        subjectGrades[period] = currentSubjectGrades?.[period] ?? null;
      }
    });
  }

  return { grades: protectedGrades, error: null };
};

module.exports = { validateGradeLockUpdate };
