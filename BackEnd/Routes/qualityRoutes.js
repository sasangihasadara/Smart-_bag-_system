const express = require("express");
const qc = require("../Controllers/qualityController");
const router = express.Router();

router.get("/",       qc.listQC);
router.post("/:id/pass", qc.markPass);
router.post("/:id/fail", qc.markFail);

module.exports = router;
