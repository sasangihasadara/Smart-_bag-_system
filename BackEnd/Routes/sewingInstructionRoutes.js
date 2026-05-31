const express = require("express");
const ctl = require("../Controllers/sewingInstructionController");
const router = express.Router();

router.get("/",     ctl.list);
router.get("/:id",  ctl.getOne);
router.post("/",    ctl.create);
router.put("/:id",  ctl.update);
router.delete("/:id", ctl.remove);

module.exports = router;
