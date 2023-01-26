# python script for reducing the size of the matrix data
import numpy as np
PATH_PREFIX = '../static/data'    # the prefix of the data path


data_name = 'VortexWithMin'        # HeatedFlow VortexWithMin  IonizationFront jungtelziemniak Sample UnsteadyCylinderFlow
MATRIX_FILE_PREFIX = PATH_PREFIX+'/'+data_name+'/matrix/data_'
# MATRIX_FILE_PREFIX = PATH_PREFIX+'/'+data_name+'/matrix/monoMesh_'

t = 59;   # 31; 59; 123; 499; 20
for i in range(t):
    file_name = MATRIX_FILE_PREFIX+str(i)+'.txt'
    mtx = np.loadtxt(file_name)
    np.savetxt(MATRIX_FILE_PREFIX+str(i)+'_min.txt', mtx, delimiter=' ', fmt='%.3e')    # %.4e; Ion .3e