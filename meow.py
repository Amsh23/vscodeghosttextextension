import cv2,mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
o=vision.HandLandmarkerOptions(base_options=python.BaseOptions(model_asset_path="hand_landmarker.task"));h=vision.HandLandmarker.create_from_options(o);c=cv2.VideoCapture("http://192.168.1.4:4747/video")
while 1:
 _,f=c.read();r=h.detect(mp.Image(image_format=mp.ImageFormat.SRGB,data=cv2.cvtColor(f,cv2.COLOR_BGR2RGB)))
 for x in r.hand_landmarks:
  for a,b in [(0,1),(1,2),(2,3),(3,4),(0,5),(5,6),(6,7),(7,8),(5,9),(9,10),(10,11),(11,12),(9,13),(13,14),(14,15),(15,16),(13,17),(17,18),(18,19),(19,20),(0,17)]: cv2.line(f,(int(x[a].x*f.shape[1]),int(x[a].y*f.shape[0])),(int(x[b].x*f.shape[1]),int(x[b].y*f.shape[0])),(0,20,255),3)
 cv2.imshow("HAND",f);cv2.waitKey(1)
#for webcam connected use c = cv2.VideoCapture(0)