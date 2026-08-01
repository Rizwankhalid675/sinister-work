// config.js — settings for the My Tasks sync + day-end report system.
//
// The private target board was created by create-my-tasks-board.js.
// Column ids below are the ones that mutation returned. If you recreate the
// board, update these ids (run the create script; it prints them).
module.exports = {
  // Your monday user id (token owner). Auto-detected at runtime if left null.
  userId: null,

  // Private board everything mirrors INTO.
  targetBoardId: '18422182084', // "My Tasks (synced)"

  // Column ids on the target board (from create-my-tasks-board.js output).
  targetColumns: {
    sourceStatus: 'text_mm59knwq',
    sourceBoard: 'text_mm59kpdd',
    due: 'date_mm59w8bd',
    sourceLink: 'link_mm59eyb8',
    sourceItemId: 'text_mm59chpw',
    lastSynced: 'text_mm594s7z',
  },

  // "Progress" status column (created explicitly; this board has no auto-Status).
  // Labels: Working on it / Done / Overdue. Gives the dashboard colored pills.
  targetStatusColumnId: 'color_mm59z299',
  targetStatusLabels: { done: 'Done', open: 'Working on it', overdue: 'Overdue' },
  // Target labels we consider "done" for reporting.
  targetDoneLabels: ['Done'],

  // Loop cadence (minutes) for continuous mode.
  loopIntervalMinutes: 10,

  // Where dated day-end reports are written.
  reportsDir: 'reports',

  // Permanent item on the target board that day-end reports are posted to as
  // updates (created by the anchor-item setup step). Loop posts here by default.
  reportAnchorItemId: '12541971320',

  // WRITE-BACK: mapping from THIS private board's status back onto source
  // boards. Only used with --commit. Keyed by source board id because label
  // sets differ per board (verified: Online Department uses index 3 = "Done").
  // Until you fill this in for a board, write-back to it is skipped even with
  // --commit — a deliberate guardrail against mis-mapping shared boards.
  writeBack: {
    // '326887787': { statusColumnId: 'status', doneLabel: 'Done' },
  },
};
