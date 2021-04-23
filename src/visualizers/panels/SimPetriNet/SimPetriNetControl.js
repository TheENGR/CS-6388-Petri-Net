/*globals define, WebGMEGlobal*/
/**
 * Generated by VisualizerGenerator 1.7.0 from webgme on Wed Apr 14 2021 10:39:10 GMT-0500 (Central Daylight Time).
 */

define([
    'js/Constants',
    'js/Utils/GMEConcepts',
    'js/NodePropertyNames'
], function (
    CONSTANTS,
    GMEConcepts,
    nodePropertyNames
) {

    'use strict';

    function SimPetriNetControl(options) {

        this._logger = options.logger.fork('Control');

        this._client = options.client;

        // Initialize core collections and variables
        this._widget = options.widget;

        this._currentNodeId = null;

        this._networkRootLoaded = false;

        this._fireableEvents = null;

        this._initWidgetEventHandlers();

        // we need to fix the context of this function as it will be called from the widget directly
        this.setFireableEvents = this.setFireableEvents.bind(this);

        this._logger.debug('ctor finished');
    }

    SimPetriNetControl.prototype._initWidgetEventHandlers = function () {
        this._widget.onNodeClick = function (id) {
            // Change the current active object
            WebGMEGlobal.State.registerActiveObject(id);
        };
    };

    /* * * * * * * * Visualizer content update callbacks * * * * * * * */
    // One major concept here is with managing the territory. The territory
    // defines the parts of the project that the visualizer is interested in
    // (this allows the browser to then only load those relevant parts).
    SimPetriNetControl.prototype.selectedObjectChanged = function (nodeId) {
        var self = this;

        // Remove current territory patterns
        if (self._currentNodeId) {
            self._client.removeUI(self._territoryId);
            self._networkRootLoaded = false;
        }

        self._currentNodeId = nodeId;

        if (typeof self._currentNodeId === 'string') {
            // Put new node's info into territory rules
            self._selfPatterns = {};
            self._selfPatterns[nodeId] = {children: 1};  // Territory "rule"

            self._territoryId = self._client.addUI(self, function (events) {
                self._eventCallback(events);
            });

            // Update the territory
            self._client.updateTerritory(self._territoryId, self._selfPatterns);
        }
    };

    /* * * * * * * * Node Event Handling * * * * * * * */
    SimPetriNetControl.prototype._eventCallback = function (events) {
        const self = this;
        console.log(events);
        events.forEach(event => {
            if (event.eid && 
                event.eid === self._currentNodeId ) {
                    if (event.etype == 'load' || event.etype == 'update') {
                        self._networkRootLoaded = true;
                    } else {
                        self.clearPetriNet();
                        return;
                    }
                }
                
        });

        if (events.length && events[0].etype === 'complete' && self._networkRootLoaded) {
            // complete means we got all requested data and we do not have to wait for additional load cycles
            self._initPetriNet();
        }
    };
	
	SimPetriNetControl.prototype._stateActiveObjectChanged = function (model, activeObjectId) {
        if (this._currentNodeId === activeObjectId) {
            // The same node selected as before - do not trigger
        } else {
            this.selectedObjectChanged(activeObjectId);
        }
    };

    /* * * * * * * * PetriNet manipulation functions * * * * * * * */
    SimPetriNetControl.prototype._initPetriNet = function () {
        const self = this;
        //just for the ease of use, lets create a META dictionary
        const META = {};
        self._client.getAllMetaNodes().forEach(node => {
            META[node.getAttribute('name')] = node.getId(); //we just need the id...
        });
		
        //now we collect all data we need for network visualization

        const petriNetNode = self._client.getNode(self._currentNodeId);
        const elementIds = petriNetNode.getChildrenIds();
        const petriNet = {places:[], transitions:[], arcs:[]};
        elementIds.forEach(elementId => {
            const node = self._client.getNode(elementId);
            // the simple way of checking type
			
			if (node.isTypeOf(META['State'])) { 
				petriNet.places[elementId] = {name: node.getAttribute('name'), tokens: node.getAttribute('Tokens'), position: node.getRegistry('position')}
			} else if (node.isTypeOf(META['Transition'])) { 
				petriNet.transitions[elementId] = {name: node.getAttribute('name'), position: node.getRegistry('position')}
			} else if (node.isTypeOf(META['Arc'])) { 
				petriNet.arcs[elementId] = {src: node.getPointerId('src'), dst: node.getPointerId('dst'), placeToTransition: node.isTypeOf(META['PlaceToTransitionArc'])}
			} 
        });
        petriNet.setFireableEvents = this.setFireableEvents;

        self._widget.initPetriNet(petriNet);
    };

    SimPetriNetControl.prototype.clearPetriNet = function () {
        const self = this;
        self._networkRootLoaded = false;
        self._widget.destroyPetriNet();
    };

    SimPetriNetControl.prototype.setFireableEvents = function (events) {
        this._fireableEvents = [];
        if (events && events.length > 1) {
            let numEvents = events.length;
			while (numEvents > 0) {
				this._fireableEvents.push(events.splice(Math.floor(Math.random() * events.length),1))
			}
        } else if (events && events.length === 0) {
            this._fireableEvents = null;
        }

        this._displayToolbarItems();
    };

    /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
    SimPetriNetControl.prototype.destroy = function () {
        this._detachClientEventListeners();
        this._removeToolbarItems();
    };
	
	SimPetriNetControl.prototype._attachClientEventListeners = function () {
        this._detachClientEventListeners();
        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged, this);
    };

    SimPetriNetControl.prototype._detachClientEventListeners = function () {
        WebGMEGlobal.State.off('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged);
    };

    SimPetriNetControl.prototype.onActivate = function () {
        this._attachClientEventListeners();
        this._displayToolbarItems();

        if (typeof this._currentNodeId === 'string') {
            WebGMEGlobal.State.registerActiveObject(this._currentNodeId, {suppressVisualizerFromNode: true});
        }
    };

    SimPetriNetControl.prototype.onDeactivate = function () {
        this._detachClientEventListeners();
        this._hideToolbarItems();
    };

    /* * * * * * * * * * Updating the toolbar * * * * * * * * * */
    SimPetriNetControl.prototype._displayToolbarItems = function () {

        if (this._toolbarInitialized === true) {
            for (var i = this._toolbarItems.length; i--;) {
                this._toolbarItems[i].show();
            }
            if (this._fireableEvents === null) {
                this.$btnSingleEvent.hide();
            } else {
                this.$btnSingleEvent.hide();
            }
        } else {
            this._initializeToolbar();
        }
    };

    SimPetriNetControl.prototype._hideToolbarItems = function () {

        if (this._toolbarInitialized === true) {
            for (var i = this._toolbarItems.length; i--;) {
                this._toolbarItems[i].hide();
            }
        }
    };

    SimPetriNetControl.prototype._removeToolbarItems = function () {

        if (this._toolbarInitialized === true) {
            for (var i = this._toolbarItems.length; i--;) {
                this._toolbarItems[i].destroy();
            }
        }
    };

    SimPetriNetControl.prototype._initializeToolbar = function () {
        var self = this,
            toolBar = WebGMEGlobal.Toolbar;

        this._toolbarItems = [];

        this._toolbarItems.push(toolBar.addSeparator());

        /************** Go to hierarchical parent button ****************/
        this.$btnReachCheck = toolBar.addButton({
            title: 'Check Petri Net Classifications',
            icon: 'glyphicon glyphicon-question-sign',
            clickFn: function (/*data*/) {
                const context = self._client.getCurrentPluginContext('PetriNetClassification',self._currentNodeId, []);
                // !!! it is important to fill out or pass an empty object as the plugin config otherwise we might get errors...
                context.pluginConfig = {};
                self._client.runServerPlugin(
                    'PetriNetClassification', 
                    context, 
                    function(err, result){
                        // here comes any additional processing of results or potential errors.
                        console.log('plugin err:', err);
                        console.log('plugin result:', result);
                });
            }
        });
        this._toolbarItems.push(this.$btnReachCheck);

        this.$btnResetPetriNet = toolBar.addButton({
            title: 'Reset simulator',
            icon: 'glyphicon glyphicon-fast-backward',
            clickFn: function (/*data*/) {
                self._widget.resetPetriNet();
            }
        });
        this._toolbarItems.push(this.$btnResetPetriNet);

        // if there is only one event we just show a play button
        this.$btnSingleEvent = toolBar.addButton({
            title: 'Fire event',
            icon: 'glyphicon glyphicon-play',
            clickFn: function (/*data*/) {
                self._widget.fireEvent(self._fireableEvents);
            }
        });
        this._toolbarItems.push(this.$btnSingleEvent);
        

        /************** Dropdown for event progression *******************/


        this._toolbarInitialized = true;
    };

    return SimPetriNetControl;
});
