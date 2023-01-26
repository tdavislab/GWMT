import json
import networkx as nx
import math


def read_txt(node_filename, edge_filename, root_type="minimum"):
    with open(node_filename, "r") as node_file:
        nodes_data = list(node_file.readlines())
    with open(edge_filename, "r") as edge_file:
        edges_data = list(edge_file.readlines())
    if not len(nodes_data) - 1 == len(edges_data):
        print("ERROR: ILLEGAL TREE!", node_filename)
        raise ValueError

    T = nx.Graph()
    min_val = float("inf")
    max_val = -min_val
    root = None

    for e, i in enumerate(nodes_data):
        node = i.split(" ")
        assert len(node) >= 4

        type_value = int(float(node[4].strip()))
        if type_value == 2:
            type_value = 1
        elif type_value >= 3:
            type_value = 2
        T.add_node(e, x=float(node[0]), y=float(node[1]), z=float(node[2]), height=float(node[3]), type=type_value,
                   color="r")

        if float(node[3]) < min_val:
            min_val = float(node[3])
            if root_type == "minimum":
                root = e
        if float(node[3]) > max_val:
            max_val = float(node[3])
            if root_type != "minimum":
                root = e

    assert root is not None

    for i in edges_data:
        vertices = i.split(" ", 1)
        u = int(vertices[0])
        v = int(vertices[1])
        dist = math.fabs(T.nodes[u]['height'] - T.nodes[v]['height'])
        T.add_edge(u, v, weight=dist)

    return T, root


def get_trees(*filenames, root_type="minimum"):
    file_ids = []
    Ts = []
    roots = []
    for filename in filenames:
        if filename.find(".txt") != -1:
            if filename.find("Node") != -1:
                edge_filename = filename.replace("Node", "Edge")
                T, root = read_txt(filename, edge_filename, root_type=root_type)
                Ts.append(T)
                roots.append(root)
                file_ids.append(filename.split(".")[0].split("_")[-1])
    return Ts, roots
