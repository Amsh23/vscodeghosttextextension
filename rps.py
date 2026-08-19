import cv2,mediapipe as mp,random,time
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
o=vision.HandLandmarkerOptions(base_options=python.BaseOptions(model_asset_path="hand_landmarker.task"));h=vision.HandLandmarker.create_from_options(o);c=cv2.VideoCapture("http://192.168.1.4:4747/video"); last=0
while 1:
 _,f=c.read();r=h.detect(mp.Image(image_format=mp.ImageFormat.SRGB,data=cv2.cvtColor(f,cv2.COLOR_BGR2RGB)))
 for x in r.hand_landmarks:
  y=[x[i].y for i in [8,12,16,20]];u="PAPER" if all(v<x[0].y for v in y) else "SCISSORS" if y[0]<x[0].y and y[1]<x[0].y else "ROCK"
  if time.time()-last>2:a=random.choice(["ROCK","PAPER","SCISSORS"]);z="DRAW" if u==a else "WIN!" if (u,a) in [("ROCK","SCISSORS"),("PAPER","ROCK"),("SCISSORS","PAPER")] else "LOSE";last=time.time();print(u,a,z)
 cv2.imshow("RPS",f);cv2.waitKey(1)