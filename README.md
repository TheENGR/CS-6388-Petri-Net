# Petri Net
This is an example Design studio aimed for developers relatively new to the [WebGME](https://webgme.org) platform based off of [StateMachineJoint](https://github.com/kecso/StateMachineJoint).
It allows model editing, simulation, and some limited model-checking functionality.
The studio implements the Petri Net domain.
For its special simulator visualization, it uses the [JointJS](https://www.jointjs.com/) javascript library.


## Installation
1) In Ubuntu with docker installed, run `docker-compose up -d`
2) Finally, navigate to `http://localhost:8888` to start using the PetriNet!
3) Run `docker-compose stop` to stop the simulation

## Usage
1) Create a new project with the default seed of the Petri Net
2) Add a New Petri Net object to the ROOT and name it
3) Open that object and begin building your default Petri Net
4) Once done, switch from the composition view to the simulation view to see it run!
    1) You can Click the Question mark button in the toolbar to get notifications as to what type of Petrinet you may have created
        1) Free-choice petri net 
            - if the intersection of the inplaces sets of two transitions are not empty, then the two transitions should be the same (or in short, each transition has its own unique set if inplaces)
        2) State machine 
            - a petri net is a state machine if every transition has exactly one inplace and one outplace.
        3) Marked graph 
            - a petri net is a marked graph if every place has exactly one out transition and one in transition.
        4) Workflow net
            - a petri net is a workflow net if it has exactly one source place s where *s = ∅, one sink place o where o* = ∅, and every x ∈ P ∪ T is on a path from s to o.
    2) Hit the Rewind button to reset the simulation
    3) Hit the play button to advance the simulation and see your tokens move
        1) Concurrent behavior and race conditions were modelled, so some transitions may steal fireability from others, look at the MutexLock example!
        2) Transition Colors
            - Fireable transitions are blue
            - Non-fireable transitions are black
            - If the net reaches a deadlock all transitions turn red and the play button is disabled

