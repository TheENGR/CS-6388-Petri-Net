"""
This is where the implementation of the plugin code goes.
The ReachCheck-class is imported from both run_plugin.py and run_debug.py
"""
import sys
import logging
from webgme_bindings import PluginBase
import json

# Setup a logger
logger = logging.getLogger('PetriNetClassification')
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)  # By default it logs to stderr..
handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)


class PetriNetClassification(PluginBase):
    def main(self):
        self.send_notification('Analyzing...')
        core = self.core
        root_node = self.root_node
        META = self.META
        active_node = self.active_node # we assume the active node is the state machine node

        places = {}
        transitions = {}
        # we build the most simple graph representation possible
        nodes = core.load_children(active_node)
        for node in nodes:
            if core.is_type_of(node, META['Place']):
                places[core.get_path(node)] = {"inports": set(), "outports": set()}
            if core.is_type_of(node, META['Transition']):
                transitions[core.get_path(node)] = {"inports": set(), "outports": set()}
        for node in nodes:
            if core.is_type_of(node, META['Arc']):
                if core.is_type_of(node, META['PlaceToTransitionArc']):
                    places[core.get_pointer_path(node, 'src')]["outports"].add(core.get_pointer_path(node, 'dst'))
                    transitions[core.get_pointer_path(node, 'dst')]["inports"].add(core.get_pointer_path(node, 'src'))
                else:
                    places[core.get_pointer_path(node, 'dst')]["inports"].add(core.get_pointer_path(node, 'src'))
                    transitions[core.get_pointer_path(node, 'src')]["outports"].add(core.get_pointer_path(node, 'dst'))

        # Free Choice:
        if len(set([frozenset(transition['inports']) for transition in transitions.values()])) == len(transitions):
            self.send_notification('This Petri Net is a Free Choice Petri Net')
        else:
            self.send_notification('This Petri Net is not a Free Choice Petri Net')
        # State Machine
        isStateMachine = True
        for transition in transitions.values():
            if len(transition['inports']) != 1 or len(transition['outports']) != 1:
                isStateMachine = False;
                break
        if isStateMachine:
            self.send_notification('This Petri Net is a State Machine')
        else:
            self.send_notification('This Petri Net is not a State Machine')
        # Marked Graph
        isMarkedGraph = True
        for place in places.values():
            if len(place['inports']) != 1 or len(place['outports']) != 1:
                isMarkedGraph = False;
                break
        if isMarkedGraph:
            self.send_notification('This Petri Net is a Marked Graph')
        else:
            self.send_notification('This Petri Net is not a Marked Graph')
        # Workflow Net
        start = ""
        end = ""
        for path, place in places.items():
            if len(place['inports']) == 0:
                if start == "":
                    start = path
                else:
                    start = ""
                    break
            if len(place['outports']) == 0:
                if end == "":
                    end = path
                else:
                    end = ""
                    break
        isWorkflowNet = start != "" and end != ""

        def isReachable(graph, s, d):
            visited = [s]
            queue = [s]

            while queue:
                n = queue.pop(0)
                if n == d:
                    return True
                for i in graph[n]['outports']:
                    if i not in visited:
                        queue.append(i)
                        visited.append(i)
            return False
        
        if isWorkflowNet:
            graph = {**places, **transitions}
            for location in graph:
                if not isReachable(graph, location, end):
                    isWorkflowNet = False
                    break
        if isWorkflowNet:
            self.send_notification('This Petri Net is a Workflow Net')
        else:
            self.send_notification('This Petri Net is not a Workflow Net')
            
                
        





