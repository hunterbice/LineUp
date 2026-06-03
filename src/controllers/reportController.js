export function createReportController(deps) {
  return {
    open() {
      const venue = deps.currentVenue();
      if (!venue) return;
      deps.trackAppEvent(venue.id, "report_open");
      deps.setReportLevel(venue.lvl);
      deps.openSheet();
      deps.renderReportSheet();
      deps.capturePresence("report", venue.id, true);
    },
    selectCrowd(level) {
      deps.setReportLevel(level);
      deps.renderReportSheet();
    },
    setLinePreset(value) {
      const field = deps.lineField();
      if (field) field.value = value;
    },
    close() {
      deps.closeSheet();
    },
    submit() {
      return deps.submitReport();
    },
  };
}
