(() => {
  const lapses = [
    { id: '1er', start: '2026-10-05', end: '2026-12-31' },
    { id: '2do', start: '2027-01-15', end: '2027-03-31' },
    { id: '3er', start: '2027-04-01', end: '2027-07-31' },
  ];

  const normalizeRecords = (student) => {
    const records = {};
    [student?.attendanceByDate, student?.attendance_by_date].forEach((source) => {
      Object.entries(source || {}).forEach(([date, subjects]) => {
        records[date] = { ...(records[date] || {}), ...(subjects || {}) };
      });
    });
    return records;
  };

  const isWithinRange = (date, startDate, endDate) => (
    (!startDate || date >= startDate) && (!endDate || date <= endDate)
  );

  const calculate = (student, { startDate = '', endDate = '', subjectId = 'general' } = {}) => {
    const bySubject = {};
    const result = { attendances: 0, absences: 0, total: 0, bySubject };
    const addRecord = (subject, status) => {
      if (subjectId !== 'general' && subject !== subjectId) return;
      if (status !== 'asistente' && status !== 'inasistente') return;
      bySubject[subject] = bySubject[subject] || { attendances: 0, absences: 0, total: 0 };
      const subjectResult = bySubject[subject];
      if (status === 'asistente') {
        result.attendances += 1;
        subjectResult.attendances += 1;
      } else {
        result.absences += 1;
        subjectResult.absences += 1;
      }
      result.total += 1;
      subjectResult.total += 1;
    };

    const records = normalizeRecords(student);
    Object.entries(records).forEach(([date, subjects]) => {
      if (!isWithinRange(date, startDate, endDate)) return;
      Object.entries(subjects || {}).forEach(([subject, savedStatus]) => {
        addRecord(subject, typeof savedStatus === 'object' && savedStatus !== null
          ? savedStatus.status
          : savedStatus);
      });
    });

    if (Object.keys(records).length) return result;

    const logs = student?.attendanceHistory || student?.attendanceLogs || [];
    if (logs.length) {
      logs.forEach((log) => {
        const date = String(log.date || '').slice(0, 10);
        if (isWithinRange(date, startDate, endDate)) addRecord(log.subject, log.status);
      });
      return result;
    }

    Object.entries(student?.attendance || {}).forEach(([subject, savedRecord]) => {
      const record = typeof savedRecord === 'object' && savedRecord !== null
        ? savedRecord
        : { status: savedRecord };
      const date = String(record.date || '').slice(0, 10);
      if ((date && isWithinRange(date, startDate, endDate))
        || (!date && !startDate && !endDate)) {
        addRecord(subject, record.status);
      }
    });
    return result;
  };

  window.ATTENDANCE_CALCULATIONS = Object.freeze({
    lapses: Object.freeze(lapses.map((lapse) => Object.freeze(lapse))),
    normalizeRecords,
    calculate,
  });
})();
