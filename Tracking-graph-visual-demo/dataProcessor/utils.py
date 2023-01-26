from http.client import ImproperConnectionState
import os
import re
import json
import numpy as np


def modify_file_names(path, name_lst, prefix):
    """
    modify the name of files listed in name_lst

    Args:
        path: prefix, such as './dataProcessor/Data/HeatedFlowVelocity'
        name_lst: [xlist_001, xlist_002, ...]
        prefix: xlist, ylist, data, ...
    
    Returns:
        None
    """

    # sort the list
    def sort_key(e):
        return int(re.search(r'\d+', e).group())

    # 1.find the offset
    offset = ''
    num_lst = []
    for name in name_lst:
        num_lst.append(int(re.search(r'\d+', name).group()))

    offset = min(num_lst)
    name_lst.sort(key=sort_key)
    print('sort', name_lst)

    # 2. modify the name
    for name in name_lst:
        num = int(re.search(r'\d+', name).group())-offset
        old_name = os.path.join(path, name)
        new_name = os.path.join(path, prefix+'_'+str(num)+'.txt')
        print(old_name, new_name)
        os.rename(old_name, new_name)

def unify_files_names(data_name):
    """
    modify names of files for a specific dataset
        Each dataset has two folders:
            matrix: (may have offset: i.e, start from 600)
                1. data_001.txt (may have other names)
                2. xlist_001.txt
                3. ylist_001.txt
            track:
                1. oc_0_1.txt
                2. treeNode_highlight_001.txt

        Args:
            data_name(str): HeatedFlowVelocity
        
        return:
            cnt: the number of timestamps
        modify the file names
            data_001.txt/MonoFile_001/data_061... => data_1
            xlist_001.txt=>xlist_1.txt
            ylist_001.txt=>ylist_1.txt
            oc_0_1.txt=>oc_0_1.txt
            treeNode_highlight_001.txt=>treeNode_highlight_1.txt
    """

    path_prefix = '../static/data/'+data_name

    # 1. modify the 'treeNode_highlight_001.txt' to 'treeNode_highlight_1.txt'
    path = path_prefix+'/track'
    cnt = 0
    file_lst = []
    for file_name in os.listdir(path):
        if 'treeNode_highlight' in file_name:
            cnt += 1
            file_lst.append(file_name)

    modify_file_names(path, file_lst, 'treeNode_highlight')

    # 2. modify the dataset in the matrix
    path = path_prefix+'/matrix'
    x_file_lst = []
    y_file_lst = []
    data_file_lst = []

    for file_name in os.listdir(path):
        if 'txt' in file_name:
            if 'xlist' in file_name:
                x_file_lst.append(file_name)
            elif 'ylist' in file_name:
                y_file_lst.append(file_name)
            else:
                data_file_lst.append(file_name)          

    modify_file_names(path, x_file_lst, 'xlist')
    modify_file_names(path, y_file_lst, 'ylist')
    modify_file_names(path, data_file_lst, 'data')

    return cnt

def load_json_data(data_name):
    ''' load the json file of the tracking graph data called 'dataname'

    Args:
        data_name (str): HeatedFlowVelocity
    Returns:
        the json data
    '''
    with open('static/jsonData/'+data_name+'.json', 'r') as f:
        return json.load(f)

def load_SF_data(data_name, t):
    '''
    load the scalar filed of the 'data_name' at timestamp t
    '''
    scalar_field = []
    with open('static/data/'+data_name+'/matrix/data_' + str(t)+'_min.txt', 'r') as f:
        for line in f.readlines():
            if line:
                line = [float(x) for x in line.strip().split()]
                scalar_field.append(line)
    return scalar_field

def transpose_data(data_name, t):
    '''
    transpose the scalar fields
        1. transpose the scalar fields matrix
        2. rename xlist_1.txt as zlist_1
        3. rename ylist_1.txt as xlist_1
        3. rename zlist_1.txt as ylist_1
    '''
    path_prefix = '../static/data/'+data_name+'/matrix'
    
    # # 1. transpose the matrix
    # for i in range(t):
    #     file_name = path_prefix+'/data_'+str(i)+'.txt'
    #     mtx = np.loadtxt(file_name)
    #     mtx = np.transpose(mtx)
    #     np.savetxt(file_name, mtx, delimiter=' ')
    
    # rename xlist_1.txt as zlist_1， ylist_1.txt as xlist_1
    x_file_lst = []
    y_file_lst = []

    for file_name in os.listdir(path_prefix):
        if 'txt' in file_name:
            if 'xlist' in file_name:
                x_file_lst.append(file_name)
            elif 'ylist' in file_name:
                y_file_lst.append(file_name)

    modify_file_names(path_prefix, x_file_lst, 'zlist')
    modify_file_names(path_prefix, y_file_lst, 'xlist')

    # zlist_1.txt as ylist_1
    z_file_lst = []
    for file_name in os.listdir(path_prefix):
        if 'txt' in file_name:
            if 'zlist' in file_name:
                z_file_lst.append(file_name)
    modify_file_names(path_prefix, z_file_lst, 'ylist')


if __name__ == '__main__':
    # unify_files_names('HeatedFlowVelocity') 
    transpose_data('IonizationFront', 123)