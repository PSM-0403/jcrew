import { useState, useRef, useEffect } from "react";
import { COLORS } from "../constants";
import { fetchGallery, uploadGalleryFile, deleteGalleryFile } from "../api/db";

export function GalleryPage({ classes, isCoach }) {
  const [selectedClass, setSelectedClass] = useState(null);
  const [filterDay, setFilterDay]         = useState(null);
  const [media, setMedia]                 = useState([]);
  const [lightbox, setLightbox]           = useState(null);
  const [loading, setLoading]             = useState(false);
  const [uploading, setUploading]         = useState(false);
  const fileInputRef = useRef(null);

  const DAYS = ["월","화","수","목","금","토","일"];
  const visibleClasses = filterDay ? classes.filter(c => (c.days ?? []).includes(filterDay)) : classes;

  useEffect(() => {
    if (!selectedClass) return;
    setLoading(true);
    fetchGallery(selectedClass)
      .then(setMedia)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedClass]);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files);
    if (!selectedClass || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const item = await uploadGalleryFile(selectedClass, file);
        setMedia(prev => [item, ...prev]);
      }
    } catch (err) {
      console.error("업로드 실패:", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (id, filePath) => {
    try {
      await deleteGalleryFile(id, filePath);
      setMedia(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error("삭제 실패:", err);
    }
  };

  return (
    <div>
      {/* 요일 필터 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {[null, ...DAYS].map(d => (
          <button key={d ?? "전체"} onClick={() => { setFilterDay(d); setSelectedClass(null); }} style={{
            padding: "6px 12px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
            border: `1.5px solid ${filterDay === d ? COLORS.ORANGE : "#ffffff22"}`,
            background: filterDay === d ? `${COLORS.ORANGE}22` : "transparent",
            color: filterDay === d ? COLORS.ORANGE : "#8899AA",
            fontSize: 12, fontWeight: filterDay === d ? 700 : 400,
          }}>{d ? `${d}요일` : "전체"}</button>
        ))}
      </div>

      {/* 수업 선택 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {visibleClasses.map(c => (
          <button key={c.id} onClick={() => setSelectedClass(c.id)} style={{
            padding: "8px 14px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
            border: `1.5px solid ${selectedClass === c.id ? COLORS.ORANGE : "#ffffff22"}`,
            background: selectedClass === c.id ? `${COLORS.ORANGE}22` : "transparent",
            color: selectedClass === c.id ? COLORS.ORANGE : "#8899AA",
            textAlign: "left",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{c.title}</div>
            <div style={{ fontSize: 11, color: selectedClass === c.id ? `${COLORS.ORANGE}bb` : "#ffffff44", marginTop: 2 }}>
              {(c.days ?? []).join("·")} · {c.startTime}
            </div>
          </button>
        ))}
      </div>

      {!selectedClass ? (
        visibleClasses.length === 0
          ? <div style={{ textAlign: "center", padding: "20px 0", color: "#8899AA", fontSize: 13 }}>해당 요일 수업이 없습니다</div>
          : <div style={{ textAlign: "center", padding: "60px 0", color: "#8899AA" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📸</div>
              <div>수업을 선택하면 사진·영상을 볼 수 있습니다</div>
            </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{classes.find(c => c.id === selectedClass)?.title}</div>
              <div style={{ fontSize: 12, color: "#8899AA" }}>{media.length}개 파일</div>
            </div>
            {isCoach && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: uploading ? "#555" : COLORS.ORANGE, color: "#fff", fontSize: 13, fontWeight: 700, cursor: uploading ? "not-allowed" : "pointer", fontFamily: "inherit" }}
                >
                  {uploading ? "업로드 중..." : "+ 사진/영상 업로드"}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFiles} style={{ display: "none" }} />
              </>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#8899AA" }}>로딩 중...</div>
          ) : media.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 0", color: "#8899AA", background: COLORS.NAVY, borderRadius: 12, border: "1px solid #ffffff11" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📷</div>
              <div style={{ fontSize: 13 }}>업로드된 파일이 없습니다</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {media.map(m => (
                <div key={m.id} style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "1", background: "#000", cursor: "pointer" }}
                  onClick={() => setLightbox(m)}>
                  {m.type === "image" ? (
                    <img src={m.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0F1F35" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 28 }}>▶</div>
                        <div style={{ fontSize: 10, color: "#8899AA", marginTop: 4 }}>영상</div>
                      </div>
                    </div>
                  )}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "4px 6px", background: "linear-gradient(transparent, rgba(0,0,0,0.7))", fontSize: 10, color: "#ccc" }}>
                    {m.uploadedAt}
                  </div>
                  {isCoach && (
                    <button onClick={e => { e.stopPropagation(); handleDelete(m.id, m.filePath); }} style={{
                      position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%",
                      background: "rgba(0,0,0,0.6)", border: "none", color: "#FCA5A5", fontSize: 12,
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>✕</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 라이트박스 */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          {lightbox.type === "image" ? (
            <img src={lightbox.url} alt="" style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 10, objectFit: "contain" }}
              onClick={e => e.stopPropagation()} />
          ) : (
            <video src={lightbox.url} controls autoPlay style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 10 }}
              onClick={e => e.stopPropagation()} />
          )}
          <button onClick={() => setLightbox(null)} style={{
            position: "fixed", top: 20, right: 20, background: "rgba(255,255,255,0.1)",
            border: "none", color: "#fff", fontSize: 20, borderRadius: "50%",
            width: 40, height: 40, cursor: "pointer",
          }}>✕</button>
        </div>
      )}
    </div>
  );
}
