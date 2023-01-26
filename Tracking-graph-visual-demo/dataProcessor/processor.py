'''
return json
{
    nodes: [],      // ele: {id: , t: , yId: , parents: [{id: , pro: , link}], children: [{} ..], 'row': , col: } // row and col means the loaction of this node in matrix
    links: [],      // ele: {id: , source: , target: , pro: ,}
    timestamps: ,
    mostFeatures: ,
    featureDis: [],     // the distribution of nodes at all of the timestamps [[t0 ], [t1 ], ...]
    scalarFields: [[scalar Field Matrix], [scalar Field Matrix], [], ...]
}
'''
from difflib import ndiff
from os import X_OK, name
import numpy as np
from numpy import PINF, append, mat, matrix, nested_iters, recarray, result_type, timedelta64, unravel_index
import copy
from numpy.core.fromnumeric import reshape, shape
from numpy.core.numerictypes import find_common_type
from numpy.ma import outer
import json
from utils import unify_files_names, transpose_data

PATH_PREFIX = '../static/data'    # the prefix of the data path

NODE_FILE_PREFIX = './dataProcessor/Data/track_0_30/treeNode_highlight_0'     # +01.txt
MAP_FILE_PREFIX = './dataProcessor/Data/track_0_30/oc_'    # +0_1.txt
MATRIX_FILE_PREFIX = './dataProcessor/Data/matrix/data_6'    # +01.txt
X_MATRIX_FILE_PREFIX = './dataProcessor/Data/matrix/xlist_6'    # +01.txt
Y_MATRIX_FILE_PREFIX = './dataProcessor/Data/matrix/ylist_6'    # +01.txt

class Processor:
    def __init__(self, data_name, t):
        '''
        data_name: the name of this dataset
        t: the number of timestamp
        '''
        self.data_name = data_name
        self.timestamps = t
        self.structure = {'nodes': [], 'links': [], 'timestamps': self.timestamps, 'mostFeatures': 0, 'nodesPerT': [], 'pRange': [], 'scalarFields': [], 'SFRange': []}
        self.start_index = 0
        self.link_index = 0

        # init scalarFields term
        self.init_scalar_fields()

        # implement the index, t, and y_index of each node; mostFeatures, and featureDis, and init parents and children
        for i in range(self.timestamps):
            self.get_index_t(i)
            print('finish', i)
        # implement the parents and children for each node and add the relevant link
        for i in range(self.timestamps-1):
            self.imple_p_c_link(i)
            print('finish implement', i)
        self.structure['pRange'] = self.get_prob_range()

        # implement the location of each node (row, col) in the matrix
        self.init_node_location()

    # init locations of all nodes 
    def init_node_location(self):
        print('init locations of all nodes')
        cnt = 0

        for i in range(self.timestamps):
            # get the x, y location of all nodes at this timestamp
            nodes_x_y = self.get_node_x_y_lst_from_file(i)

            # get the indice list of x and y
            x_indice = self.get_x_or_y_lst_from_file(i, 0)
            y_indice = self.get_x_or_y_lst_from_file(i, 1)

            # for each node, find its loaction in the matrix
            for node_x_y in nodes_x_y:
                x = node_x_y[0]
                y = node_x_y[1]

                row = self.find_location(x, x_indice)
                col = self.find_location(y, y_indice)

                # implement the node attributes
                self.structure['nodes'][cnt]['r'] = row
                self.structure['nodes'][cnt]['c'] = col

                cnt += 1
    
    # transform all scalarfields
    def init_scalar_fields(self):
        scalar_fields = []
        # only need to give the dimension
        mtx = np.loadtxt(PATH_PREFIX+'/'+self.data_name+'/matrix/data_0.txt')
        mtx_row, mtx_col = mtx.shape
        self.structure['scalarFields'] = [mtx_row, mtx_col]

        # set the range of scalar field values
        scalar_fields_vals = []
        for i in range(self.timestamps):
            file_name = MATRIX_FILE_PREFIX+str(i)+'.txt'
            mtx = np.loadtxt(file_name)
            scalar_fields_vals.append(mtx.min())
            scalar_fields_vals.append(mtx.max())
        
        self.structure['SFRange'] = [min(scalar_fields_vals), max(scalar_fields_vals)] 

        # for i in range(self.timestamps):
        #     scalar_field = []
        #     file_name = MATRIX_FILE_PREFIX+str(i)+'.txt'
            
        #     with open(file_name, 'r') as f:
        #         for line in f.readlines():
        #             if line:
        #                 line = [float(x) for x in line.strip().split()]
        #                 scalar_field.append(line)
            
        #     scalar_fields.append(scalar_field)

        # print('row', len(scalar_fields))
        # print('col', len(scalar_fields[0][0]))
        
        # self.structure['scalarFields'] = scalar_fields

    # get the probability range of all of these links
    def get_prob_range(self):
        prob_range = [100, 0]
        for link in self.structure['links']:
            prob = link['p']
            if prob_range[0] > prob:
                prob_range[0] = prob
            if prob_range[1] < prob:
                prob_range[1] = prob
        return prob_range

    # implement the parents and children for each node and add the relevant link
    # parents: [{id: , pro: , link}]
    def imple_p_c_link(self, t):
        # find the probaility matrix, then find the chidlren and parent, then add each link into Link
        path = MAP_FILE_PREFIX+str(t)+'_'+str(t+1)+'.txt'
        p_matrix = self.read_Numpy_F(path)
        # con_matrix = self.trans_con_probability(p_matrix)
        con_matrix = p_matrix

        (row_num, col_num) = con_matrix.shape
        row_index_id_map = self.structure['nodesPerT'][t]
        col_index_id_map = self.structure['nodesPerT'][t+1]

        # traverse the matrix
        for i in range(row_num):
            for j in range(col_num):
                prob = con_matrix[i][j]
                if prob > 1e-20:
                    i_id = row_index_id_map[i]
                    j_id = col_index_id_map[j]
                    # add this link
                    link = {'id': self.link_index, 'src': i_id, 'tgt': j_id, 'p': prob}
                    self.structure['links'].append(link)
                    # add element into the parents and children
                    ele_i = {'node': i_id, 'p': prob, 'link': self.link_index}
                    ele_j = {'node': j_id, 'p': prob, 'link': self.link_index}
                    self.structure['nodes'][i_id]['children'].append(ele_j)
                    self.structure['nodes'][j_id]['parents'].append(ele_i)
                    self.link_index += 1
                    
    # process data get the index and y_Index of this node (reorder)
    def get_index_t(self, t):
        y_index_lst = []
        num_nodes = 0
        id_lst = []     # the index list

        # if t == 0: then find the 0_1 file, get the number of row () as the number of
        if t == 0:
            p_matrix = self.read_Numpy_F(MAP_FILE_PREFIX+'0_1.txt')
            num_nodes = p_matrix.shape[0]
            for i in range(num_nodes):
                y_index_lst.append(i)

        # else, open ./Data/track_0_30/oc_t_t+1.txt to calculate the order
        else:
            last_t = t-1
            path = MAP_FILE_PREFIX+str(last_t)+'_'+str(t)+'.txt'
            p_matrix = self.read_Numpy_F(path)
            num_nodes = p_matrix.shape[1]
            # first, recalculate the conditional matrix (change the probability)
            con_matrix = self.trans_con_probability(p_matrix)
            con_matrix = p_matrix
            # second, get the y_index_lst
            y_index_lst = self.get_y_index_lst_method_2(con_matrix, t)
        print(y_index_lst)

        # load the data into nodes
        for i in range(num_nodes):
            node = {'id': self.start_index, 't': t, 'yId': y_index_lst[i], 'parents': [], 'children': []}
            self.structure['nodes'].append(node)
            id_lst.append(self.start_index)
            self.start_index += 1

        # implement 'featureDis'
        self.structure['nodesPerT'].append(id_lst)
        # implement 'mostFeatures'
        mostFeatures = max(y_index_lst)
        if self.structure['mostFeatures'] < mostFeatures:
            self.structure['mostFeatures'] = mostFeatures

    # transform the probability matrix into the conditional probability matrix
    def trans_con_probability(self, matrix):
        (row_num, col_num) = matrix.shape
        # sum each row
        row_sum = []
        for i in range(row_num):
            row_sum.append(matrix[i].sum())

        # calculate the conditional probability matrix
        for i in range(row_num):
            sum_val = row_sum[i]
            if sum_val > 1e-10:
                for j in range(col_num):
                    matrix[i][j] /= sum_val

        return matrix
        
    # get the y index list at each timestamp
    def get_y_index_lst(self, p_matrix, t):
        (row_num, col_num) = p_matrix.shape
        y_index_lst = []
        row_index_lst = []
        col_index_lst = []
        
        for i in range(row_num):
            row_index_lst.append(i)
        for i in range(col_num):
            col_index_lst.append(i)
            y_index_lst.append(-1)

        # traverse the outer
        outer_stop = False
        matrix = p_matrix
        while not outer_stop:
            # stop delete
            inner_stop = False
            while not inner_stop:
                # find the position of the max probability, find the mapping, and then delete this row and this col
                (max_row, max_col) = unravel_index(np.argmax(matrix), matrix.shape)
                max_row_index = self.structure['nodesPerT'][t-1][row_index_lst[max_row]]       # get the index of the mapped row
                ideal_mapped_y_index = self.structure['nodes'][max_row_index]['yId']     # get the mapped id
                real_mapped_y_index = self.get_y_index(ideal_mapped_y_index, y_index_lst)
                y_index_lst[col_index_lst[max_col]] = real_mapped_y_index   # get the y_index
                # delete the row and col in the matrix, and in the row_index and col_index
                del row_index_lst[max_row]
                del col_index_lst[max_col]
                matrix = np.delete(matrix, max_col, axis=1)
                matrix = np.delete(matrix, max_row, axis=0)
            
                # stop: when all value are 0
                if matrix.size == 0 or matrix.max() < 1e-20:
                    inner_stop = True
            
            outer_stop = True
            if len(col_index_lst) != 0:
                # get the matrix based on the col_index_lst
                matrix = self.get_new_matrix(p_matrix, col_index_lst)
                if matrix.max() > 1e-20:
                    outer_stop = False
                    # restore the row_index_lst
                    row_index_lst = []
                    for i in range(row_num):
                        row_index_lst.append(i)
                    
        # check the col_index_lst, if there still is unmatched node, then regard this as a new node, assign the y_index
        for y_index in col_index_lst:
            # print('remianing:', col_index_lst)
            max_y_index = max(y_index_lst)
            y_index_lst[y_index] = max_y_index+1

        return y_index_lst

    # get the mapped_y_index, based on the ideal_mapped_y_index and y_index_lst
    def get_y_index(self, ideal_mapped_y_index, y_index_lst):
        # if there has not had this ideal_mapped_y_index, then ideal_mapped_y_index
        if ideal_mapped_y_index not in y_index_lst:
            return ideal_mapped_y_index
        else:
            # find the closest position
            shift = 1
            while True:
                top = ideal_mapped_y_index-shift
                btm = ideal_mapped_y_index+shift
                if top >= 0 and top not in y_index_lst:
                    # print('find insert new posotion', top)
                    return top
                if btm not in y_index_lst:
                    # print('find insert new posotion', btm)
                    return btm
                shift += 1
                
    # load the numpy matrix from file 
    def read_Numpy_F(self, path):
        mtx = np.loadtxt(path, ndmin=2)
        return mtx

    # get the new matrix based on the current matrix and the col_index_lst
    def get_new_matrix(self, matrix, col_index_lst):
        new_matrix = ''
        count = 0
        for col_index in col_index_lst:
            col = matrix[:, col_index]
            if count == 0:
                new_matrix = col
            else:
                new_matrix = np.c_[new_matrix, col]
            count += 1
        return new_matrix

    # store self.structure into python file
    def store_json_file(self):
        with open(PATH_PREFIX+'/'+self.data_name+'.json', 'w') as f:
            json.dump(self.structure, f, indent=4)
    
    # get the yId of the this row
    def get_y_index_lst_method_2(self, p_matrix, t):
        uncertaintyDict = {}    # store the uncertainty node 'y_index': [possible1, possible2]

        (row_num, col_num) = p_matrix.shape
        y_index_lst = []        # this will be returned
        col_index_lst = []      # this is used to record the remaining y_index (index: colID) 
        for i in range(col_num):
            col_index_lst.append(i)
            y_index_lst.append(-1)
        
        stop = False

        while not stop:
            # find the biggest uncertainty value in this matrix
            (max_row, max_col) = unravel_index(np.argmax(p_matrix), p_matrix.shape)
            max_row_index = self.structure['nodesPerT'][t-1][max_row]       # get the index of the mapped row
            ideal_mapped_y_index = self.structure['nodes'][max_row_index]['yId']     # get the idealest mapped id

            # if ideal id is available
            if ideal_mapped_y_index not in y_index_lst:
                # set the position of this node as this ideal id
                y_index_lst[col_index_lst[max_col]] = ideal_mapped_y_index

                # if the ideal id is in the uncertaintyDict
                corres_node = int(self.check_id_in_uncertaintyDict(ideal_mapped_y_index, uncertaintyDict))

                # find the corresponding uncertaity node, set the position of this node as the other uncertainty value, then delete it
                if corres_node != -1:
                    if uncertaintyDict[str(corres_node)][0] == ideal_mapped_y_index:
                        y_index_lst[corres_node] = uncertaintyDict[str(corres_node)][1]
                    else:
                        y_index_lst[corres_node] = uncertaintyDict[str(corres_node)][0]
                    del uncertaintyDict[str(corres_node)]
            
            # if ideal id is not available
            else:
                # find the closest yId
                closest_YId_lst = self.get_closest_id(ideal_mapped_y_index, y_index_lst)

                # if only have one closest yId
                if len(closest_YId_lst) == 1:
                    closest_YId = closest_YId_lst[0]
                    # set the position of this node as this closest yId,
                    y_index_lst[col_index_lst[max_col]] = closest_YId
                
                    # if the closest id is in the uncertaintyDict
                    corres_node = int(self.check_id_in_uncertaintyDict(closest_YId, uncertaintyDict))

                    # find the corresponding uncertaity node, set the position of this node as the other uncertainty value, then delete it
                    if corres_node != -1:
                        if uncertaintyDict[str(corres_node)][0] == closest_YId:
                            y_index_lst[corres_node] = uncertaintyDict[str(corres_node)][1]
                        else:
                            y_index_lst[corres_node] = uncertaintyDict[str(corres_node)][0]
                        del uncertaintyDict[str(corres_node)]

                # if have two closest yId
                elif len(closest_YId_lst) == 2:
                    closest_YId_1 = closest_YId_lst[0]
                    closest_YId_2 = closest_YId_lst[1]
                    
                    corres_node_1 = int(self.check_id_in_uncertaintyDict(closest_YId_1, uncertaintyDict))
                    corres_node_2 = int(self.check_id_in_uncertaintyDict(closest_YId_2, uncertaintyDict))

                    # if both two values are not in the uncertaintyDict
                    if corres_node_1 == -1 and corres_node_2 == -1:
                        # set this item into the uncertaintyDict
                        uncertaintyDict[str(col_index_lst[max_col])] = [closest_YId_1, closest_YId_2]
                    
                    # if both two values are in the uncertaintyDict
                    elif corres_node_1 != -1 and corres_node_2 != -1:
                        # if the two values are in the same one, assign them randomly, then delete
                        if corres_node_1 == corres_node_2:
                            y_index_lst[corres_node_1] = closest_YId_1
                            y_index_lst[col_index_lst[max_col]] = closest_YId_2

                        # if the two values are in two items, assign the two item as another value, then delete them, and add this new one
                        else:
                            if uncertaintyDict[str(corres_node_1)][0] == closest_YId_1:
                                y_index_lst[corres_node_1] = uncertaintyDict[str(corres_node_1)][1]
                            else:
                                y_index_lst[corres_node_1] = uncertaintyDict[str(corres_node_1)][0]
                            del uncertaintyDict[str(corres_node_1)]

                            if uncertaintyDict[str(corres_node_2)][0] == closest_YId_2:
                                y_index_lst[corres_node_2] = uncertaintyDict[str(corres_node_2)][1]
                            else:
                                y_index_lst[corres_node_2] = uncertaintyDict[str(corres_node_2)][0]
                            del uncertaintyDict[str(corres_node_2)]

                            uncertaintyDict[str(col_index_lst[max_col])] = [closest_YId_1, closest_YId_2]

                    # if only one value in the uncertaintyDict
                    else:
                        closest_YId = ''
                        corres_node = ''
                        if corres_node_1 != -1:
                            corres_node = corres_node_1
                            closest_YId = closest_YId_1
                        if corres_node_2 != -1:
                            corres_node = corres_node_2
                            closest_YId = closest_YId_2
                        
                        # find the corresponding uncertaity node, set the position of this node as the other uncertainty value, then delete it and add this new one
                        if uncertaintyDict[str(corres_node)][0] == closest_YId:
                            y_index_lst[corres_node] = uncertaintyDict[str(corres_node)][1]
                        else:
                            y_index_lst[corres_node] = uncertaintyDict[str(corres_node)][0]
                        del uncertaintyDict[str(corres_node)]
                        uncertaintyDict[str(col_index_lst[max_col])] = [closest_YId_1, closest_YId_2]
            
            # delete this column, get a new p_matrix, delete corresponding y_index, if size is not zero, and this matrix still have max then continue to iterate
            del col_index_lst[max_col]
            p_matrix = np.delete(p_matrix, max_col, axis=1)

            stop = True
            if len(col_index_lst) != 0:
                # get the matrix based on the col_index_lst
                if p_matrix.max() > 1e-20:
                    stop = False

        # check uncertaintyDict get the small value
        for key in uncertaintyDict:
            pos_lst = uncertaintyDict[key]
            y_index_lst[int(key)] = min(pos_lst)

        # check the col_index_lst, if there still is unmatched node, then regard this as a new node, assign the y_index
        for y_index in col_index_lst:
            max_y_index = max(y_index_lst)
            y_index_lst[y_index] = max_y_index+1

            # replace = False
            # for i in range(max_y_index+1):
            #     if i not in y_index_lst:
            #         y_index_lst[y_index] = i
            #         replace = True
            #         break
            # if not replace:
            #     y_index_lst[y_index] = max_y_index+1

        return y_index_lst

    # check if an id is in the uncertaintyDict
    # return -1 means that do not find it, else find it in this y_index
    def check_id_in_uncertaintyDict(self, id, uncertaintyDict):
        for key in uncertaintyDict:
            if id == uncertaintyDict[key][0] or id == uncertaintyDict[key][1]:
                return key
        return -1
    

    # get the closest y_id
    def get_closest_id(self, ideal_y_id, y_index_lst):
        shift = 1
        while True:
            res = []
            top = ideal_y_id-shift
            btm = ideal_y_id+shift
            if top >= 0 and top not in y_index_lst:
                res.append(top)
            if btm not in y_index_lst:
                res.append(btm)
            shift += 1
            if len(res) != 0:
                return res


    # get the nodes list of the give time from file
    def get_node_x_y_lst_from_file(self, t):
        result = []
        file_name = NODE_FILE_PREFIX+str(t)+'.txt'
        with open(file_name, 'r') as f:
            for line in f.readlines():
                if line:
                    line_lst = line.strip().split()
                    result.append([float(line_lst[0]), float(line_lst[1])])
        return result
    
    # get the x or y indice list from file
    def get_x_or_y_lst_from_file(self, t, type):
        name_prefix = X_MATRIX_FILE_PREFIX if type == 0 else Y_MATRIX_FILE_PREFIX
        file_name = name_prefix+str(t)+'.txt'
        result = []
        with open(file_name, 'r') as f:
            for line in f.readlines():
                if line:
                    result.append(float(line.strip()))
        return result

    # find the index of x in lst
    def find_location(self, x, lst):
        index = 0
        for ele in lst:
            if abs(ele-x) < 1e-3:
                return index
            index += 1
        print('one node does not been found!')

if __name__ == '__main__':
    # new name: HeatedFlow; 
    data_name = 'VortexWithMin'        # HeatedFlow VortexWithMin IonizationFront UnsteadyCylinderFlow Sample

    # init all of the path
    NODE_FILE_PREFIX = PATH_PREFIX+'/'+data_name+'/track/treeNode_highlight_'
    MAP_FILE_PREFIX = PATH_PREFIX+'/'+data_name+'/track/oc_'
    MATRIX_FILE_PREFIX = PATH_PREFIX+'/'+data_name+'/matrix/data_' 
    # MATRIX_FILE_PREFIX = PATH_PREFIX+'/'+data_name+'/matrix/monoMesh_'      # for the sample dataset
    X_MATRIX_FILE_PREFIX = PATH_PREFIX+'/'+data_name+'/matrix/xlist_'
    Y_MATRIX_FILE_PREFIX = PATH_PREFIX+'/'+data_name+'/matrix/ylist_'

    # modify the name of file
    t = unify_files_names(data_name)

    # check the dimesion of data, init the scalarFields = [num of row, num of col], and transpose if applicable
    # mtx = np.loadtxt(PATH_PREFIX+'/'+data_name+'/matrix/data_0.txt')
    # mtx_row, mtx_col = mtx.shape
    # if mtx_row > mtx_col:
    #     transpose_data(data_name, t)

    processor = Processor(data_name, t)
    processor.store_json_file()

    # mtx = np.loadtxt(PATH_PREFIX+'/'+data_name+'/matrix/data_0.txt')
    # row, col = mtx.shape
    # print(row, col)