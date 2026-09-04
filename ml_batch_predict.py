import sys
import json
import joblib
import pandas as pd
import os

try:
    model_path = os.path.join(os.path.dirname(__file__), "ml", "models", "random_forest_v1.joblib")
    model = joblib.load(model_path)
    classes = model.classes_
    
    input_data = json.loads(sys.argv[1])
    
    if not input_data:
        print(json.dumps([]))
        sys.exit(0)
        
    df = pd.DataFrame(input_data)
    
    if hasattr(model, "feature_names_in_"):
        for col in model.feature_names_in_:
            if col not in df.columns:
                df[col] = 0.0
        df = df[model.feature_names_in_]
        
    preds = model.predict(df)
    probs = model.predict_proba(df)
    
    results = []
    for i, pred in enumerate(preds):
        class_probs = {str(c): float(p) for c, p in zip(classes, probs[i])}
        confidence = class_probs.get(str(pred), 0.0)
        results.append({
            "predicted_class": str(pred),
            "confidence": confidence,
            "class_probabilities": class_probs,
            "model_version": "random_forest_v1.0.0"
        })
    print(json.dumps(results))
except Exception as e:
    print(json.dumps({"error": str(e)}))
