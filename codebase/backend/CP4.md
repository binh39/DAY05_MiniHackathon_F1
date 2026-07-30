# CP4 — lối tắt artifact chấm điểm

Bạn đang ở thư mục source `ai-lecture-video/`. Theo rubric hackathon, artifact
CP4 phải nằm ở **gốc repo**, cùng cấp với `README.md`, để người chấm tìm được
ngay. Các file canonical là:

- [`../spec.md`](../spec.md) — AI Spec §1–§9, quality bar và kế hoạch CP5.
- [`../evidence/mining-log.md`](../evidence/mining-log.md) — evidence B, cách
  tái kiểm số liệu và các trích dẫn đã rút gọn.
- [`../eval/golden-set-v1.md`](../eval/golden-set-v1.md) — 20 golden case.
- [`../eval/run-01-2026-07-30.md`](../eval/run-01-2026-07-30.md) — lượt đo đầu
  (17 pass, 1 fail, 2 not run; chưa đạt quality bar).

Không tạo bản copy thứ hai trong `ai-lecture-video/eval/`, vì hai bản rất dễ
lệch nhau khi rerun và làm người chấm không biết bản nào là bản nộp.
