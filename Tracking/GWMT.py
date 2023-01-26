from utilities import *
from FGW import fgw_lp, fgw_partial_lp
from optim import NonConvergenceError
import time


class GWMergeTree:
    def __init__(self, tree: nx.Graph, root: int):
        """ Initialization of a merge tree object

        Parameters
        ----------
        tree:  networkx.Graph
               the merge tree and its data
        root:  int
               the id of the root of the merge tree
        """
        self.tree = tree
        self.root = root

        try:
            assert nx.is_tree(self.tree)
            assert self.root in self.tree.nodes()
        except AssertionError:
            print("The tree data is incorrect! "
                  "Either the object is not a tree, or the root is not a valid point in the tree.")
            raise ValueError

    def label_validation(self, coordinate_labels: list, scalar_name="height", edge_weight_name="weight"):
        try:
            for node in self.tree.nodes():
                assert scalar_name in self.tree.nodes[node]
                for label in coordinate_labels:
                    assert label in self.tree.nodes[node]
        except AssertionError:
            print("The tree data is incorrect! "
                  "Either the scalar function name is not valid, or the label names for nodes are not valid.")
            raise KeyError

        try:
            for node in self.tree.nodes():
                assert "type" in self.tree.nodes[node]
        except AssertionError:
            print("You have to specify the node type (0: minima, 1: saddle, 2: maxima) for nodes in the tree!")
            raise KeyError

        try:
            for u, vs in self.tree.adjacency():
                for v, e in vs.items():
                    assert edge_weight_name in e
        except AssertionError:
            print("The edge weight name is incorrect!")
            raise KeyError


class TrackInfo:
    def __init__(self, t: int, node_id: int, color: int):
        """ Initialization of a TrackInfo object

        Parameters
        ----------
        t:       int
                 the time step of the node in the trajectory
        node_id: int
                 the node id of the node in the merge tree at time step t
        color:   int
                 the trajectory ID, which may not be consecutive
        """

        self.time = t
        self.node_id = node_id
        self.trajectory_id = color

    def __str__(self):
        return "T_{} - Node_{}".format(self.time, self.node_id)


class GWTracking:
    def __init__(self,
                 trees: list,
                 scale: float,
                 labels: list,
                 scalar_name="height",
                 edge_weight_name="weight",
                 weight_mode="shortestpath",
                 prob_distribution="uniform",
                 ):
        """ Initialization for the pFGW feature tracking framework

            Parameters
            ----------
            trees : list[GWMergeTree],
                    a list of GWMergeTree for feature tracking
            scale : float,
                    the scale for coordinates of nodes. This term is used for normalization.
                    e.g. if the scalar field domain is a 2D rectangle, then scale=max(width,height) of the domain
            labels: list[str],
                    list for names of the coordinate dimensions of nodes in the GWMergeTree object
                    e.g. ["x", "y", "z"] identifying the coordinate of a 3D point
            scalar_name: str, default="height"
                         the name for the scalar field in GWMergeTree
            edge_weight_name: str, default="weight"
                         the name for the weight of edges in GWMergeTree
            weight_mode : str, default="shortestpath"
                          declare the strategy to generate the weight matrix W for the measure network.
                          Options are ["shortestpath", "lca"]
            prob_distribution: str, default="uniform"
                               declare the strategy to assign probability vector p to nodes
                               Options are ["uniform", "ancestor"]

            References
            ----------
            .. [1]
            """

        self.trees = [x.tree for x in trees]
        self.roots = [x.root for x in trees]

        for tree in trees:
            tree.label_validation(labels, scalar_name, edge_weight_name)

        self.weight_mode = weight_mode
        if self.weight_mode not in {"shortestpath", "lca"}:
            print("Weight matrix mode undefined! Use function value difference by default.")
            self.weight_mode = "shortestpath"

        self.prob_distribution = prob_distribution
        if self.prob_distribution not in {"uniform", "ancestor"}:
            print("Probability Distribution of nodes has to be \'uniform\' or \'ancestor\'! "
                  "Using uniform distribution by default.")
            self.prob_distribution = "uniform"

        self.scalar_name = scalar_name
        self.edge_weight_name = edge_weight_name

        self.labels = labels
        self.scale = scale

        self.num_trees = len(self.trees)
        self.CList = []
        self.pList = []
        self.hList = []
        self.initialize_measure_network()

    def initialize_measure_network(self):
        # Initialize the measure network intrinsic weight & probability distribution
        for e in range(self.num_trees):
            T = self.trees[e]

            # C refers to the measure network intrinsic weight matrix. shape: (N, N)
            # p refers to the probability distribution across nodes. shape: (N, )
            C, p = get_distance_and_distribution(T,
                                                 distribution=self.prob_distribution,
                                                 weight_mode=self.weight_mode,
                                                 root=self.roots[e],
                                                 scalar_name=self.scalar_name,
                                                 edge_weight_name=self.edge_weight_name
                                                 )

            self.CList.append(C)
            self.pList.append(p)

            # h refers to the labels for nodes (extrinsic information). shape: (N, label_len)
            self.hList.append(coordinate_matrix(T, self.labels))

        # rescale both extrinsic and intrinsic information
        scale = scale_normalization(self.hList, self.CList, self.scale)
        for i in range(len(self.hList)):
            for j in range(len(self.hList[0][0])):
                self.hList[i][:, j] /= scale[j]
            self.CList[i] /= scale[-1]

    def fgw_wrapper(self, C1, C2, p, q, g1, g2, alpha, m, amijo=True, G0=None):
        """ A wrapper that returns the coupling matrix for the partial OT problem

        Parameters
        ----------
        C1 : ndarray, shape (ns, ns)
             Metric cost matrix in the source space
        C2 : ndarray, shape (nt, nt)
             Metric cost matrix in the target space
        p : ndarray, shape (ns,)
             marginal probability restriction in the source space
        q : ndarray, shape (nt,)
             marginal probability restriction in the target space
        g1: ndarray, shape (ns, ds)
             labels for nodes in the source space, where "ds" is the dimension of labels for nodes in the source space
        g2: ndarray, shape (nt, dt)
             labels for nodes in the target space, where "dt" is the dimension of labels for nodes in the target space
        alpha: float, in range [0, 1]
             balancing parameter to control the ratio between Wasserstein and GW proportion
             alpha=0: pure Wasserstein distance
             alpha=1: pure GW distance
        m: float, in range (0, 1]
             probability mass to be preserved in the output coupling matrix
             m=1: FGW distance
        amijo: bool, optional
            If True the steps of the line-search is found via an amijo research. Else closed form is used.
            If there is convergence issues use False.
        G0: ndarray, shape (ns, nt), optional
             Initial state for the coupling matrix for gradient descent
             if G0 is None, it is set to be p[:,None]*q[None,:]

        Returns
        -------
        C: ndarray, shape (ns, nt)
             the coupling matrix for the solution to compute pFGW distance
        """

        sizeP = C1.shape[0]
        sizeQ = C2.shape[0]
        M = np.zeros((sizeP, sizeQ))

        # loss should be squared
        for i in range(sizeP):
            for j in range(sizeQ):
                M[i, j] = label_distance(g1[i], g2[j], metric="l2") ** 2

        if m < 1:
            try:
                return fgw_partial_lp((1 - alpha) * M, C1, C2, p, q, m=m, alpha=alpha, amijo=amijo, G0=G0)
            except (ValueError, NonConvergenceError):
                print("Fail to converge. Turning off amijo research. Using closed form.")
                return fgw_partial_lp((1 - alpha) * M, C1, C2, p, q, m=m, alpha=alpha, amijo=False, G0=G0)
        try:
            return fgw_lp((1 - alpha) * M, C1, C2, p, q, loss_fun='square_loss', alpha=alpha, amijo=amijo, G0=G0)
        except (ValueError, NonConvergenceError):
            print("Fail to converge. Turning off amijo research. Using closed form.")
            return fgw_lp((1 - alpha) * M, C1, C2, p, q, loss_fun='square_loss', alpha=alpha, amijo=False, G0=G0)

    def tracking(self,
                 timesteps: list,
                 alpha: float,
                 m_list: list,
                 log=False,
                 amijo=False):
        """ Main process for pFGW tracking

        Parameters
        ----------
        timesteps: list[int],
                 list of time steps to be processed with feature tracking
        alpha:   float, in range [0, 1]
                 balancing parameter to control the ratio between Wasserstein and GW proportion
                 alpha=0: pure Wasserstein distance
                 alpha=1: pure GW distance
        m_list:  list[float], each in range (0, 1]
                 list of probabilities to be preserved between each adjacent time steps in timesteps
                 length should be equal to len(id_list) - 1
                 m=1: FGW distance
        log:     bool, optional
                 if False, we output the information of each feature trajectory
                             and the coupling matrix for each adjacent time steps containing only maxima
                 if True, we add the information of maximum matched distance and the number of tracks in "logs"
        amijo: bool, optional
            If True the steps of the line-search is found via an amijo research. Else closed form is used.
            If there is convergence issues use False.

        Returns
        -------
        trajectory_info: dict,
                         keys are the trajectory ID, which may not be consecutive
                         values are list[TrackInfo]
                         each list is a trajectory consists of multiple TrackInfo
                         each TrackInfo represents a node at a time step
        ocs: list[ndarray],
             the coupling matrix for only maxima between each adjacent time steps
        logs: dict, if log=True
              logs["trajectory_num"] is an integer for the number of trajectories
              logs["max_matched_dist"] is a number for the maximum matched distance
        """

        while timesteps[-1] >= self.num_trees:
            timesteps.pop(-1)
        if len(timesteps) < 2:
            print("No enough element to track. Aborting...")
            return None

        try:
            assert len(m_list) >= len(timesteps) - 1
            if len(m_list) > len(timesteps) - 1:
                print("Warning! You provide more m values than the tracking process needs.")
        except AssertionError:
            print("You provide fewer m values than the tracking process needs! Aborting...")
            return None

        # assign a color id for each node. Nodes with the same color id generate a trajectory.
        self.trees[timesteps[0]] = graph_color(self.trees[timesteps[0]])

        if log:
            logs = {}
            matched_dists = []

        trajectory_info = {}
        ocs = []

        for i in range(1, len(timesteps)):
            # adjacent time step
            # id1: the previous step
            # id2: the current step
            id1 = timesteps[i - 1]
            id2 = timesteps[i]

            oc, _ = self.fgw_wrapper(self.CList[id1], self.CList[id2],
                                     self.pList[id1], self.pList[id2],
                                     self.hList[id1], self.hList[id2],
                                     alpha, m=m_list[i-1], amijo=amijo)

            try:
                assert abs(oc.sum() - m_list[i - 1]) < 1e-6
            except AssertionError:
                print("Incorrect computation for (partial-)OT. "
                      "Please check your input to make sure the optimization is legitimate.")
                raise ValueError

            # assign a color id for each node in the current step based on the matching to the previous step
            self.trees[id2] = graph_color(self.trees[id2], self.trees[id1], oc)

            # compute the maximum matched distance, if necessary
            if log:
                max_dist = 0
                for node1 in self.trees[id1].nodes():
                    if self.trees[id1].nodes[node1]["type"] < 2:
                        continue
                    for node2 in self.trees[id2].nodes():
                        if self.trees[id2].nodes[node2]["type"] < 2:
                            continue
                        if self.trees[id1].nodes[node1]["color_value"] == self.trees[id2].nodes[node2]["color_value"]:
                            max_dist = max(max_dist, label_distance(self.hList[id1][node1],
                                                                    self.hList[id2][node2]))
                            break
                matched_dists.append(max_dist)

            # We filter out coupling information unrelated to maxima
            # Note: the filtered coupling matrix does not sum to m
            id1_maxima = []
            id2_maxima = []
            for node in self.trees[id1]:
                if self.trees[id1].nodes[node]['type'] != 2:
                    continue
                id1_maxima.append(node)
            for node in self.trees[id2]:
                if self.trees[id2].nodes[node]['type'] != 2:
                    continue
                id2_maxima.append(node)
            id1_maxima = np.asarray(id1_maxima, dtype=int)
            id2_maxima = np.asarray(id2_maxima, dtype=int)
            oc_maxima = oc[id1_maxima]
            oc_maxima = oc_maxima[:, id2_maxima]
            ocs.append(oc_maxima)

        # compute the appearances for color ids
        # for color ids that appear more than once, they form a trajectory
        trajectory_lengths_maxima = {}
        for i in range(len(timesteps)):
            id = timesteps[i]
            for node in self.trees[id]:
                if self.trees[id].nodes[node]['type'] != 2:
                    continue
                if self.trees[id].nodes[node]['color_value'] not in trajectory_lengths_maxima:
                    trajectory_lengths_maxima[self.trees[id].nodes[node]['color_value']] = 1
                else:
                    trajectory_lengths_maxima[self.trees[id].nodes[node]['color_value']] += 1

        for i in range(len(timesteps)):
            id = timesteps[i]
            for node in self.trees[id]:
                if self.trees[id].nodes[node]['type'] != 2:
                    continue
                color = self.trees[id].nodes[node]['color_value']
                if trajectory_lengths_maxima[color] > 1:
                    if color in trajectory_info:
                        trajectory_info[color].append(TrackInfo(id, node, color))
                    else:
                        trajectory_info[self.trees[id].nodes[node]['color_value']] = [TrackInfo(id, node, color)]

        if log:
            logs["trajectory_num"] = sum([1 if trajectory_lengths_maxima[item] > 1 else 0
                                          for item in trajectory_lengths_maxima])
            logs["max_matched_dist"] = max(matched_dists)
            return trajectory_info, ocs, logs
        return trajectory_info, ocs

    def adaptive_m_tuning(self,
                          timesteps: list,
                          alpha: float,
                          matched_dist_limit: float,
                          amijo=False,
                          m_tuning_range=np.arange(0.5, 1+1e-6, 0.01)):
        while timesteps[-1] >= self.num_trees:
            timesteps.pop(-1)
        if len(timesteps) < 2:
            print("No enough element to track. Aborting...")
            return None

        # assign a color id for each node. Nodes with the same color id generate a trajectory.
        self.trees[timesteps[0]] = graph_color(self.trees[timesteps[0]])

        matched_dists = []
        adaptive_ms = []

        for i in range(1, len(timesteps)):
            # adjacent time step
            # id1: the previous step
            # id2: the current step
            id1 = timesteps[i - 1]
            id2 = timesteps[i]

            available_m = []

            for adaptive_m in m_tuning_range:
                round_m = round(adaptive_m, 2)
                oc, _ = self.fgw_wrapper(self.CList[id1], self.CList[id2],
                                         self.pList[id1], self.pList[id2],
                                         self.hList[id1], self.hList[id2],
                                         alpha, m=round_m, amijo=amijo)

                try:
                    assert abs(oc.sum() - round_m) < 1e-6
                except AssertionError:
                    print("Incorrect computation for (partial-)OT. "
                          "Please check your input to make sure the optimization is legitimate.")
                    raise ValueError

                # assign a color id for each node in the current step based on the matching to the previous step
                self.trees[id2] = graph_color(self.trees[id2], self.trees[id1], oc)

                # compute the maximum matched distance
                max_dist = 0
                num_matches = 0
                for node1 in self.trees[id1].nodes():
                    if max_dist > matched_dist_limit:
                        break
                    if self.trees[id1].nodes[node1]["type"] < 2:
                        continue
                    for node2 in self.trees[id2].nodes():
                        if max_dist > matched_dist_limit:
                            break
                        if self.trees[id2].nodes[node2]["type"] < 2:
                            continue
                        if self.trees[id1].nodes[node1]["color_value"] == self.trees[id2].nodes[node2]["color_value"]:
                            num_matches += 1
                            max_dist = max(max_dist, label_distance(self.hList[id1][node1],
                                                                    self.hList[id2][node2]))
                            break

                if max_dist <= matched_dist_limit:
                    available_m.append((round_m, max_dist, num_matches))
                else:
                    continue

            # if i == 113:
            #     print(available_m)
            if len(available_m) < 1:
                return -1, [], -1

            available_m.sort(key=lambda x: (-x[-1], x[1], -x[0]))
            final_m, instance_matched_dist, _ = available_m[0]
            adaptive_ms.append(final_m)
            matched_dists.append(instance_matched_dist)

            oc, _ = self.fgw_wrapper(self.CList[id1], self.CList[id2],
                                     self.pList[id1], self.pList[id2],
                                     self.hList[id1], self.hList[id2],
                                     alpha, m=final_m, amijo=amijo)

            assert abs(oc.sum() - final_m) < 1e-6
            self.trees[id2] = graph_color(self.trees[id2], self.trees[id1], oc)

        # compute the appearances for color ids
        # for color ids that appear more than once, they form a trajectory
        trajectory_lengths_maxima = {}
        for i in range(len(timesteps)):
            id = timesteps[i]
            for node in self.trees[id]:
                if self.trees[id].nodes[node]['type'] != 2:
                    continue
                if self.trees[id].nodes[node]['color_value'] not in trajectory_lengths_maxima:
                    trajectory_lengths_maxima[self.trees[id].nodes[node]['color_value']] = 1
                else:
                    trajectory_lengths_maxima[self.trees[id].nodes[node]['color_value']] += 1

        return sum([1 if trajectory_lengths_maxima[item] > 1 else 0
                                      for item in trajectory_lengths_maxima]), adaptive_ms, max(matched_dists)
