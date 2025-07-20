const express = require('express');
const db = require('../db');
const auth = require('./authMiddleware');
const router = express.Router();

// 获取广告
router.get('/', (req, res) => {
  db.all('SELECT * FROM ads', [], (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    res.json(rows);
  });
});
// 新增广告
router.post('/', auth, (req, res) => {
  const { position, img, url } = req.body;
  db.run('INSERT INTO ads (position, img, url) VALUES (?, ?, ?)', [position, img, url], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ id: this.lastID });
  });
});
// 修改广告
router.put('/:id', auth, (req, res) => {
  const { img, url } = req.body;
  db.run('UPDATE ads SET img=?, url=? WHERE id=?', [img, url, req.params.id], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ changed: this.changes });
  });
});
// 删除广告
router.delete('/:id', auth, (req, res) => {
  db.run('DELETE FROM ads WHERE id=?', [req.params.id], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ deleted: this.changes });
  });
});

module.exports = router; 