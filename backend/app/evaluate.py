"""Compares the pipeline's saved readings with the known correct answers for the demo documents."""
import json

from . import config, pipeline, reference
from .agents import patient_match, reader, verification


def _center_inside(box, truth):
    y, x = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
    return truth[0] - 10 <= y <= truth[2] + 10 and truth[1] - 10 <= x <= truth[3] + 10


def main():
    labels = json.loads((config.DEMO_DATA / "patients/hero-labels.json").read_text(encoding="utf-8"))["documents"]
    files = dict(pipeline.load_folder(config.DEMO_DATA / "documents/rashid-mehmood"))
    r = dict(labs_total=0, labs_correct=0, labs_verified=0, labs_verified_correct=0, meds_total=0, meds_correct=0, boxes_total=0, boxes_on_target=0,
             dates_correct=0, pages=0, wrong_patient_auto=0, doubtful_caught=0, doubtful_total=0, unreadable_caught=0, unreadable_total=0)
    failures = []
    for doc in labels:
        image = pipeline.file_pages(doc["file"], files[doc["file"]])[doc["page"] - 1]
        data, _ = reader.read_page(image)
        second, _ = verification.second_read(image)
        r["pages"] += 1
        boxes = {b["key"]: b["box_2d"] for b in doc["boxes"]}
        if doc["unreadable"]:
            r["unreadable_total"] += 1
            caught = not data.get("readable", True) or not (data.get("patient_name") or data.get("file_no"))
            r["unreadable_caught"] += caught
            continue
        r["dates_correct"] += data.get("doc_date") == doc["date"]
        is_other = doc["patient"]["mrn"] != "CM-1042"
        if is_other and data.get("file_no") == "CM-1042":
            r["wrong_patient_auto"] += 1
        for i, lab in enumerate(doc.get("labs") or []):
            r["labs_total"] += 1
            found = next((x for x in data.get("labs", []) if reference.lab_code(x.get("test")) == reference.lab_code(lab[0])), None)
            ok = bool(found) and verification._num(found.get("value")) == float(lab[1])
            r["labs_correct"] += ok
            if not ok:
                failures.append(f"{doc['file']}: {lab[0]} expected {lab[1]}, got {found and found.get('value')}")
            if found and not verification.check_lab(found, second):
                r["labs_verified"] += 1
                r["labs_verified_correct"] += ok
            if found and isinstance(found.get("box_2d"), list) and len(found["box_2d"]) == 4:
                r["boxes_total"] += 1
                on = _center_inside(found["box_2d"], boxes[f"lab:{i}"])
                r["boxes_on_target"] += on
                if not on:
                    failures.append(f"{doc['file']}: highlight off target for {lab[0]}")
        for i, med in enumerate(doc.get("meds") or []):
            found = next((x for x in data.get("medicines", []) if reference.medicine_key(x.get("name")) == reference.medicine_key(med["name"])), None)
            if med["doubtful"]:
                r["doubtful_total"] += 1
                r["doubtful_caught"] += bool(found and verification.check_medicine(found, second))
                continue
            r["meds_total"] += 1
            ok = bool(found) and verification._num(found.get("dose")) == verification._num(med["dose"])
            r["meds_correct"] += ok
            if not ok:
                failures.append(f"{doc['file']}: {med['name']} expected {med['dose']}, got {found and found.get('dose')}")
    print(json.dumps(r, indent=1))
    print("failures:", failures)


if __name__ == "__main__":
    main()
