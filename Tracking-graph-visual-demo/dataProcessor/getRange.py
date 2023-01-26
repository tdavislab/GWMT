# get the value range of a file

from codecs import escape_encode
from re import L
from tkinter import filedialog
from tokenize import Double

totalLst = []

with open('../static/data/IonizationFront/matrix/data_0.txt', 'r') as f:
    while True:
        line = f.readline()
        if line:
            processed_line = line.strip().split(' ')
            for item in processed_line:
                totalLst.append(float(item))
        else:
            break

print(min(totalLst))
print(max(totalLst))