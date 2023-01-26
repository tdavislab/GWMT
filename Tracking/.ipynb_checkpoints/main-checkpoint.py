from GWMT import GWTracking
import argparse

parser = argparse.ArgumentParser(usage="--input --output --dataset -w(--weight)"
                                       " -p(--prob) --extrinsic --st --ed --alpha "
                                       "[--example].", description="help info.")
parser.add_argument("--output", default="./parameter_tuning/", help="root of the output folder.")
parser.add_argument("--input", default="./data/VortexStreet/", help="root of the input folder.")
parser.add_argument("--dataset", default="Wing", help="name of the dataset you want to store in.")
parser.add_argument("-w", "--weight", default='shortestpath', choices=['shortestpath', 'ultra'],
                    help="choices of weight matrix")
parser.add_argument("-p", "--prob", default='uniform', choices=['uniform', 'persistence', 'ancestor'],
                    help="choices of probability distribution over vertices")
parser.add_argument("--ml", type=float, default=1.0, help="parameter m for partial Wasserstein/GW distance")
parser.add_argument("--mh", type=float, default=1.0, help="parameter m for partial Wasserstein/GW distance")
parser.add_argument("--extrinsic", default="coordinate", choices=['coordinate', 'function', 'type'],
                    help="choices of extrinsic strategy")
parser.add_argument("-t", "--treetype", default="st", choices=["st", "jt", "fake"], help="type of merge tree")
parser.add_argument("--st", type=int, default=0, help="starting id of the input")
parser.add_argument("--ed", type=int, default=-1, help="ending id of the input")
parser.add_argument("--alpha", default=0.5, help="choices of alpha")
parser.add_argument("--example", action="store_true")
parser.add_argument("--ids", help="id list of the tree for comparison. Format: [start_id],[gap],[num_instances]")
parser.add_argument("--curve", action="store_true", help="FGW loss curve over different alpha values")
parser.add_argument("--normalize", action="store_true", help="switch of normalizing two terms")
parser.add_argument("--tracking", action="store_true", help="switch of feature tracking")
parser.add_argument("--initial", action="store_true", help="initially set G0 to be w.r.t. Wasserstein distance")
parser.add_argument("--plotalpha", action="store_true")
parser.add_argument("--plotl", action="store_true")
parser.add_argument("--main", action="store_true")
parser.add_argument("--maxmatchdist", default=0.05, help="the maximum allowed Euclidean distance for matched points")
args = parser.parse_args()

mt_framework = GWTracking(output_root=args.output,
                    input_dir=args.input,
                    dataset_name=args.dataset,
                    prob_distribution=args.prob,
                    weight_mode=args.weight,
                    st_id=args.st,
                    ed_id=args.ed,
                    alpha=args.alpha,
                    extrinsic=args.extrinsic,
                    tree_type=args.treetype,
                    normalization=True,
                    complete_matching=args.tracking,
                    initial=args.initial,
                    mh=args.mh,
                    ml=args.ml,
                    output_main_results=args.main,
                    max_match_dist=args.maxmatchdist
                    )

# mt_framework.init()

if args.tracking:
    try:
        ids = args.ids
        id_list_params = ids.split(",")
        assert len(id_list_params) == 3
        start_id = int(id_list_params[0])
        id_gap = int(id_list_params[1])
        num_instance = int(id_list_params[2])
    except TypeError:
        print("ID type has to be integers!")
        exit()
    except AssertionError:
        print("Incorrect ID list format!")
        exit()

    print("Tracking...")
    id_list = [start_id + i * id_gap for i in range(num_instance)]

    if args.plotl:
        mt_framework.plot_l(id_list)
    elif args.plotalpha:
        mt_framework.plot_alpha(id_list)
        # mt_framework.plot_parameter(timesteps)
    else:
        mt_framework.output_tracking(id_list)
    exit()

# Below is the code for pairwise distance matrix with specific settings
if args.example or args.curve:
    # Below is the code to output instances
    try:
        ids = args.ids
        id_list_params = ids.split(",")
        assert len(id_list_params) == 3
        start_id = int(id_list_params[0])
        id_gap = int(id_list_params[1])
        num_instance = int(id_list_params[2])
    except TypeError:
        print("ID type has to be integers!")
        exit()
    except AssertionError:
        print("Incorrect ID list format!")
        exit()

    id_list = [start_id + i * id_gap for i in range(num_instance)]

    mt_framework.output_curve(id_list)
else:
    mt_framework.pairwise_instance_dist()
