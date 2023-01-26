import os
import math
import sys
import copy
import numpy as np
import matplotlib.pyplot as plt
from matplotlib import cm
import matplotlib.colors as colors
import networkx as nx


def scale_normalization(hlist, pdist, region_scale):
    dimension = len(hlist[0][0])
    scale = np.zeros((dimension + 1, ))
    N = len(hlist)
    assert len(hlist) == N

    scale[:dimension] = region_scale

    assert len(pdist) == N
    max_pdist = None
    min_pdist = None
    for i in range(N):
        if max_pdist is None:
            max_pdist = np.max(pdist[i])
        else:
            max_pdist = max(max_pdist, np.max(pdist[i]))
        if min_pdist is None:
            min_pdist = np.min(pdist[i])
        else:
            min_pdist = min(min_pdist, np.min(pdist[i]))

    scale[-1] = max_pdist - min_pdist
    print("Scale:", scale)
    return scale


def djs_find(f, x):
    if f[x] != x:
        f[x] = djs_find(f, f[x])
    return f[x]


def coordinate_matrix(g, labels=None):
    if (labels is None) or len(labels) < 1:
        print("Warning! No label name for node labels is provided!")
        return None
    tmp = np.zeros((g.number_of_nodes(), len(labels)))
    for e, n in enumerate(g.nodes()):
        node = g.nodes[n]
        for ee, label in enumerate(labels):
            tmp[e][ee] = node[label]
    return tmp


class GraphColorMemory:
    max_idx = 0


def graph_color(T, T_ref=None, oc=None):
    # if there is no reference tree, this is the first tree
    # we assign an id to each point based on a certain order. Here we use the key order
    if T_ref is None:
        k = T.nodes.keys()
        pos = []
        for i in k:
            pos.append(i)

        pos.sort()
        order = dict()
        cnt = 0
        for i in range(len(pos)):
            if pos[i] not in order:
                order[pos[i]] = cnt
                cnt += 1

        diff_color = len(order)

        if GraphColorMemory.max_idx < diff_color:
            GraphColorMemory.max_idx = diff_color

        for i in k:
            assert i in order
            color_idx = order[i]
            T.nodes[i]['color_value'] = color_idx
    else:
        # there is a reference tree. It should be the tree at the previous adjacent time step
        assert oc is not None

        N, M = oc.shape
        match_axis0 = np.argmax(oc, axis=0)  # len(match_axis0) == M
        match_axis1 = np.argmax(oc, axis=1)  # len(match_axis1) == N

        assert N == len(T_ref.nodes.keys())
        assert M == len(T.nodes.keys())

        for j in range(M):
            x = match_axis0[j]
            y = match_axis1[x]
            if j == y and T.nodes[j]["type"] == T_ref.nodes[x]["type"] and (oc[x][y] > 0):
                T.nodes[j]["color_value"] = T_ref.nodes[x]["color_value"]
            else:
                T.nodes[j]["color_value"] = GraphColorMemory.max_idx
                GraphColorMemory.max_idx += 1

    return T


def get_dist2parent_distribution(T: nx.Graph, root: int, scalar_name: str):
    dist2parent = {}
    li = list()
    node = root
    dist2parent[node] = 0
    li.append(node)
    heights = []
    while len(li) > 0:
        node = li.pop(-1)
        heights.append(T.nodes[node][scalar_name])
        for u, vs in T.adjacency():
            if u != node:
                continue
            for v, e in vs.items():
                if v not in dist2parent:
                    dist2parent[v] = e['weight']
                    li.append(v)

    dists = np.asarray(list(dist2parent.values()), dtype=float)
    dist2parent[root] = np.max(heights) - np.min(heights)
    prob_weight = [dist2parent[key] for key in sorted(dist2parent.keys())]
    prob_weight /= np.sum(prob_weight)
    return np.asarray(prob_weight, dtype=float)


def get_distance_and_distribution(tree, distribution="uniform", weight_mode="shortestpath", **params):
    """
    Required field for the strategy choice in **params
    ---------------------------------------------------
    distribution="uniform": None

    distribution="ancestor": params["root"], int, the id of the root node in the tree
                             params["scalar_name"], str, the name for the scalar function of nodes in the tree

    weight_mode="shortestpath": params["edge_weight_name"], str, the name for the edge weight in the tree

    weight_mode="lca": params["root"], int, the id of the root node in the tree
                       params["scalar_name"], str, the name for the scalar function of nodes in the tree
    """
    num_of_nodes = tree.number_of_nodes()
    if distribution == "uniform":
        p = np.ones((num_of_nodes,)) / num_of_nodes
    elif distribution == "ancestor":
        assert "root" in params
        assert "scalar_name" in params
        p = get_dist2parent_distribution(tree, params["root"], params["scalar_name"])
    else:
        p = np.ones((num_of_nodes,)) / num_of_nodes

    if weight_mode == "shortestpath":
        assert "edge_weight_name" in params
        weight_str = params["edge_weight_name"]
    elif weight_mode == "lca":
        assert "scalar_name" in params
        assert "root" in params
        C = np.zeros((num_of_nodes, num_of_nodes))
        lca_matrix = lca(tree, params["root"])
        for node_a in tree.nodes:
            for node_b in tree.nodes:
                lca_node = lca_matrix[node_a, node_b]
                C[node_a][node_b] = tree.nodes[lca_node][params["scalar_name"]]
        return C, p
    else:
        assert "edge_weight_name" in params
        weight_str = params["edge_weight_name"]

    D = list(nx.all_pairs_dijkstra_path_length(tree, weight=weight_str))
    C = np.zeros((num_of_nodes, num_of_nodes))
    for ii in range(num_of_nodes):
        dist_zip = zip(*sorted(D[ii][1].items()))
        dist = list(dist_zip)
        C[ii, :] = dist[1]
    return C, p


def lca(T, root):
    num = T.number_of_nodes()
    lca_mat = np.zeros((num, num), dtype=int) - 1
    ff = {}
    col = {}
    ancestor = {}
    for node in T.nodes():
        ff[node] = node
        col[node] = False
        ancestor[node] = node

    TarjanOLCA(T, root, None, ff, col, ancestor, lca_mat)
    # print(lca_mat)
    # exit()
    return lca_mat


def TarjanOLCA(T, u, parent, ff, col, ancestor, lca_mat):
    for neighbor in T.neighbors(u):
        if parent is not None and neighbor == parent:
            continue
        TarjanOLCA(T, neighbor, u, ff, col, ancestor, lca_mat)
        fu = djs_find(ff, u)
        fv = djs_find(ff, neighbor)
        if fu != fv:
            ff[fv] = fu
        fu = djs_find(ff, u)
        ancestor[fu] = u

    col[u] = True
    for node in T.nodes():
        if col[node] and lca_mat[u, node] < 0:
            fv = djs_find(ff, node)
            lca_mat[u, node] = lca_mat[node, u] = ancestor[fv]


def label_distance(a, b, metric="l2"):
    if metric == "l2":
        assert len(a) == len(b)
        return np.linalg.norm(a-b)
    else:
        raise NotImplementedError

