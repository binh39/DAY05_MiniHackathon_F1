# Brainstorm — Phần 3: Giải pháp tương tự đã nghiên cứu

**Lát cắt đang benchmark:** một học viên ôn lại một buổi học từ PDF slide dài 40–80 trang; hệ thống chọn các ý quan trọng, có căn cứ và tạo video tiếng Việt dưới 10 phút, có chapter, slide minh họa và liên kết về trang nguồn.

**Thời điểm nghiên cứu:** 31/07/2026.  
**Phương pháp:** walkthrough flow theo tài liệu chính thức của sản phẩm, đối chiếu từng bước với job “nắm lại mạch bài nhanh và kiểm tra được nguồn”. Các nhận định “đáng né” là phân tích khoảng trống so với lát cắt của nhóm, không phải tuyên bố rằng sản phẩm luôn thất bại.

> **Giới hạn bằng chứng:** đây là desk research có nguồn kiểm tra được, chưa thay thế yêu cầu trong `02-guide.md` rằng mỗi thành viên trực tiếp dùng thử một sản phẩm. Trước khi chép vào `spec.md` §3, nhóm cần chạy hands-on với cùng một PDF mẫu và lưu ảnh màn hình/ghi chú; nếu kết quả thực tế khác tài liệu công khai thì ưu tiên quan sát thực tế.

---

## 1. NotebookLM — Video Overviews

### ① Họ giải job này bằng flow nào?

1. Người dùng tạo notebook và tải PDF/Slides hoặc các nguồn khác lên.
2. Trong `Studio`, chọn `Video Overview`.
3. Trước khi tạo, người dùng có thể chọn định dạng (`Brief`, `Explainer` hoặc `Cinematic`), ngôn ngữ, phong cách hình ảnh và viết steering prompt để chỉ rõ chủ đề/nguồn cần ưu tiên.
4. NotebookLM tạo video trong nền; sau đó người dùng mở video, tua, đổi tốc độ phát và gửi phản hồi tốt/xấu.
5. Nếu muốn kiểm tra nội dung kỹ hơn, người dùng có thể quay lại phần chat của notebook; câu trả lời chat được giới hạn theo các nguồn đã chọn và có citation dẫn tới đoạn nguồn. Tài liệu chính thức không khẳng định Video Overview có citation theo từng cảnh hoặc từng phát biểu.

### ② Một điều đáng học

**Cho người dùng điều khiển phạm vi trước khi sinh nội dung.** NotebookLM cho chọn/bỏ chọn nguồn và steering theo chủ đề trước khi tạo artifact. Với VLearn, pattern tương ứng là hiển thị rõ “video chỉ dựa trên PDF buổi 2”, cho chọn chapter/trang cần ưu tiên và không tự kéo kiến thức ngoài tài liệu vào để làm lời thoại trôi chảy hơn.

### ③ Một điều đáng né

**Không để một lần bấm tạo video trở thành hộp đen.** Flow công khai của Video Overview đi từ thiết lập thẳng tới generate, không có bước duyệt outline được mô tả; Google cũng cảnh báo video có thể sai hoặc lỗi âm thanh và đôi khi mất hơn 30 phút để tạo. Với nội dung học tập, một video trôi chảy nhưng chọn sai ý chính sẽ khiến người học tin sai trước khi có cơ hội sửa.

### ④ Mình sẽ khác gì ở lát cắt này?

VLearn chèn một checkpoint bắt buộc: `PDF → outline 4–6 chapter kèm trang nguồn → người dùng duyệt/sửa → tạo video`. Trong video, mỗi chapter hiện các trang đã dùng và có nút `Mở slide gốc`; trang không đọc được hoặc ý không đủ căn cứ phải bị cảnh báo/loại, không được bù bằng kiến thức ngoài PDF. Sản phẩm chỉ phục vụ một buổi học và một mục tiêu ôn dưới 10 phút, thay vì tạo nhiều loại artifact nghiên cứu tổng quát.

**Nguồn chính thức:** [NotebookLM — thêm và quản lý nguồn](https://support.google.com/notebooklm/answer/16215270?hl=en), [NotebookLM — tạo Video Overview](https://support.google.com/notebooklm/answer/16454555?hl=en-GB), [NotebookLM — chat và citation](https://support.google.com/notebooklm/answer/16179559?hl=en).

---

## 2. Google Vids — “Help me create” và Convert Slides

### ① Họ giải job này bằng flow nào?

1. Người dùng mở một video trống và vào `Storyboard`/`Help me create`.
2. Người dùng viết prompt, gắn PDF hoặc Google Slides từ Drive bằng `@`.
3. Gemini tạo bản nháp gồm outline, các scene, nội dung chữ, media, script và voiceover.
4. Người dùng xem, sửa hoặc xóa từng scene; có thể đổi text, hình/video, nhạc, transition và timing trước khi xuất.
5. Một flow khác là `Convert Slides`: mỗi slide gốc trở thành một scene, speaker notes được đưa vào script; sau đó người dùng có thể tạo script, AI voiceover, nhạc và animation rồi chỉnh lại trước khi render/xuất MP4.

### ② Một điều đáng học

**AI tạo bản nháp có cấu trúc, con người sửa ở đúng đơn vị scene.** Google Vids không chỉ trả về một video đã chốt; outline, script và scene vẫn chỉnh được trước khi xuất. VLearn nên cho sửa tên chapter, ý chính, trang nguồn và lời thoại ngay trên outline thay vì bắt người dùng regenerate toàn bộ video chỉ vì một ý sai.

### ③ Một điều đáng né

**Không bắt học viên phải biết prompt và tự biên tập như một video creator.** Google Vids là công cụ tạo video đa dụng: người dùng phải mô tả mục tiêu, gắn tài liệu và tự quyết định cách dựng. Tài liệu công khai cũng không mô tả cơ chế citation từ từng câu/scene về đúng trang PDF. Nếu bê nguyên flow này sang VLearn, chi phí chuẩn bị có thể gần bằng tự làm video và media minh họa có thể trông hợp chủ đề nhưng không chứng minh được nội dung.

### ④ Mình sẽ khác gì ở lát cắt này?

VLearn tự điền sẵn ngữ cảnh từ buổi học đang mở; học viên không cần prompt. AI chỉ đề xuất 4–6 chapter theo budget dưới 10 phút, kèm `ý chính — trang nguồn — thời lượng dự kiến — trạng thái đủ/thiếu căn cứ`. Người dùng duyệt quyết định nội dung chứ không phải dựng video chuyên nghiệp; layout, giọng tiếng Việt, subtitle và transition dùng template cố định để giảm thao tác và giảm lỗi.

**Nguồn chính thức:** [Google Vids — lập kế hoạch video bằng AI](https://support.google.com/docs/answer/15067819?hl=en), [Google Vids — chuyển Slides thành video](https://support.google.com/docs/answer/15577408?hl=en), [Google Vids — chỉnh sửa và xuất video](https://support.google.com/docs/answer/15082958?hl=en).

---

## 3. Synthesia — Assistant / PowerPoint to video

### ① Họ giải job này bằng flow nào?

1. Người dùng chọn `Start with Assistant`, mô tả chủ đề, đối tượng và mục tiêu; có thể đính kèm PDF, PowerPoint, Word, URL hoặc nhiều file.
2. Người dùng đặt thời lượng, chọn delivery style (`Presentation` cho nội dung dày hoặc `Cinematic` cho nhịp nhanh), template và brand kit nếu có.
3. Assistant tạo bản nháp video rồi cho người dùng tiếp tục trao đổi để sửa script và visual ngay trong editor.
4. Với PowerPoint import, mỗi slide được đưa vào project; text, shape, hình và video trở thành phần tử có thể sửa, còn speaker notes được dùng làm script. Người dùng thêm avatar/voice, chỉnh scene rồi generate video.
5. Flow AI Assistant cũ còn thể hiện một checkpoint rõ: tạo và sửa outline trước, sau đó mới tạo scene/script và đưa sang editor.

### ② Một điều đáng học

**Hỏi các ràng buộc quyết định chất lượng trước khi generate và giữ đầu ra có thể sửa.** Duration, audience, objective, language/delivery style giúp hệ thống biết phải nén đến đâu và nói theo cách nào. VLearn đã có sẵn audience và objective từ ngữ cảnh khóa học, nhưng vẫn nên cho người dùng xác nhận `ôn nhanh dưới 10 phút` và xem budget thời lượng theo từng chapter trước khi render.

### ③ Một điều đáng né

**Không dùng độ bóng bẩy hoặc avatar để thay cho độ tin cậy.** Synthesia tối ưu mạnh cho khâu trình bày, template, avatar và visual; tài liệu chính thức được nghiên cứu không mô tả citation theo trang PDF. Trong bài học, giọng đọc tự tin và hình ảnh đẹp có thể làm nội dung thiếu căn cứ có vẻ đáng tin hơn. Import speaker notes làm script cũng không giải quyết được PDF chỉ có từ khóa/hình nhưng thiếu lời giảng.

### ④ Mình sẽ khác gì ở lát cắt này?

VLearn ưu tiên `grounding trước, trình bày sau`: không dùng avatar trong MVP; mỗi câu/ý trong script phải map về ít nhất một trang nguồn, mỗi chapter có nút quay về slide, và outline phải được duyệt trước khi TTS/render. Nếu slide chỉ có hình hoặc từ khóa mà không đủ căn cứ để khôi phục lời giảng, hệ thống nói rõ giới hạn thay vì tự sáng tác phần diễn giải.

**Nguồn chính thức:** [Synthesia — tạo video bằng Assistant](https://help.synthesia.io/en/articles/13759605-how-do-i-create-a-video-using-assistant), [Synthesia — AI Video Assistant và bước duyệt outline](https://help.synthesia.io/en/articles/7193999-how-do-i-create-content-with-the-legacy-ai-video-assistant), [Synthesia — import PowerPoint](https://help.synthesia.io/en/articles/6341783-how-do-i-import-powerpoint-slides-into-synthesia).

---

## 4. Canva — Video Presentation / Animated Presentation

### ① Họ giải job này bằng flow nào?

1. Người dùng chọn template presentation/video hoặc import PowerPoint vào Canva.
2. Người dùng tự chỉnh từng slide bằng text, ảnh, clip, animation và transition; Magic Design/Magic Write có thể hỗ trợ tạo bản nháp từ prompt.
3. Người dùng tự ghi narration, màn hình hoặc talking head; Canva hỗ trợ caption và một số công cụ cải thiện audio.
4. Sau khi hoàn thiện, người dùng trình chiếu, chia sẻ hoặc xuất presentation động thành video.

Canva giải tốt job **tác giả tự biến nội dung đã hiểu thành video**, nhưng không trực tiếp giải quyết quyết định khó nhất của nhóm: từ một PDF dài, ý nào đủ quan trọng và đủ căn cứ để đưa vào bản ôn tập.

### ② Một điều đáng học

**Giữ một editor trực quan và template ổn định để sửa nhanh.** Người dùng có thể nhìn thấy từng slide/scene, thay nội dung hoặc media và xem lại trước khi xuất. VLearn không cần editor đầy đủ như Canva, nhưng nên cho phép sửa trực tiếp tên chapter, bullet chính và narration; template cố định giúp thay đổi nội dung mà không phải dựng lại bố cục.

### ③ Một điều đáng né

**Không ghép nhiều công cụ rời rồi gọi đó là một flow ôn tập.** Import slide, nhờ AI viết, chọn media, thu narration, tạo caption và xuất video vẫn đòi người dùng đóng vai content creator. Magic Design tạo từ prompt và kho media, không phải cơ chế chứng minh mỗi phát biểu đến từ trang nào. Với học viên chỉ có 10–20 phút, chi phí tạo có thể lớn hơn chi phí tự đọc slide.

### ④ Mình sẽ khác gì ở lát cắt này?

VLearn tự động hóa phần sản xuất lặp lại bằng một template duy nhất, nhưng chỉ sau khi AI hoàn thành và người dùng duyệt quyết định học thuật: ý chính, mạch chapter, trang nguồn và lời thoại. Người học chỉ cần chọn PDF của buổi học, duyệt outline và xem; không phải chọn stock media, animation, camera hay tự thu âm.

**Nguồn chính thức:** [Canva — Video Presentation Maker](https://www.canva.com/create/video-presentations/), [Canva — Animated Presentation Maker](https://www.canva.com/create/animated-presentations/), [Canva — Slideshow Maker và import PowerPoint](https://www.canva.com/create/slideshows/).

---

## 5. Tổng hợp quyết định thiết kế rút ra

| Sản phẩm | Họ tối ưu chính | Pattern đáng lấy | Khoảng trống so với lát cắt VLearn |
|---|---|---|---|
| NotebookLM | Hiểu và tái định dạng một tập nguồn | Chọn nguồn, steering, format ngắn | Flow video công khai không có checkpoint duyệt outline; citation trong video không được tài liệu xác nhận |
| Google Vids | Tạo và biên tập video đa dụng | Outline/scene/script là bản nháp sửa được | Cần prompt và thao tác creator; không đặt trace về trang PDF làm trung tâm |
| Synthesia | Video trình bày có voice/avatar | Chọn duration/audience/style; sửa trong editor | Độ bóng bẩy có thể che rủi ro sai; không thấy cơ chế citation theo trang trong tài liệu đã xem |
| Canva | Thiết kế/ghi hình presentation | Editor trực quan, template dễ sửa | Phần chọn và kiểm chứng kiến thức vẫn do người dùng tự làm |

### Chốt “mình khác gì” trong một câu

> Không cạnh tranh bằng video đẹp hơn; VLearn tạo **video ôn tập có thể kiểm chứng**: tự lấy đúng PDF của buổi học, nén thành outline theo budget dưới 10 phút, bắt buộc người dùng duyệt trước khi render và giữ liên kết `chapter/ý trong script → trang slide gốc` xuyên suốt trải nghiệm.

### Các quyết định chuyển sang spec §4–§6

1. **Conditional automation:** AI tự tạo outline/script khi có căn cứ; người dùng quyết định trước khi render; case thiếu căn cứ bị cảnh báo hoặc loại.
2. **Hai tầng kiểm soát:** duyệt outline trước video và mở đúng trang nguồn trong lúc xem.
3. **Không yêu cầu prompt:** mục tiêu, audience, ngôn ngữ và nguồn được lấy từ ngữ cảnh VLearn; người dùng chỉ chọn/chỉnh phạm vi.
4. **Editor tối thiểu:** sửa chapter, bullet, trang nguồn và narration; không build editor media/animation tổng quát.
5. **Không dùng vẻ ngoài để biểu thị độ đúng:** trạng thái căn cứ và cảnh báo phải hiện rõ; video/voice chỉ là lớp trình bày.

## 6. Checklist hands-on trước khi đưa vào `spec.md`

Dùng cùng một PDF mẫu của data pack cho các sản phẩm truy cập được và ghi lại:

- tên người thử, ngày thử, tài khoản/gói sử dụng;
- ảnh màn hình input, bước trước generate, output và đường sửa output;
- có/không bước duyệt outline;
- có/không citation tới đúng trang trong video;
- một lỗi cụ thể quan sát được, không chỉ đánh giá cảm tính;
- thời gian từ upload đến video xem được;
- cập nhật lại bốn câu trả lời ở trên nếu quan sát thực tế khác tài liệu.
