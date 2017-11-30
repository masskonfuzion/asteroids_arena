// Some classes/helper functions for finite state machine

// ============================================================================
// FSM State Interface Class
// ============================================================================
function FSMStateInterface(stateName = null) {
    this.stateName = stateName;
    this.isTerminal = false;
    this.transitions = [];
    // Note that transitions contain conditions to evaluate, and next-states. If no tests pass, then by default, the state stays the same
}

FSMStateInterface.prototype.enter = function() {
    // Function called upon entering this state
    throw new Error("Function must be implemented by subclass");
    
};

FSMStateInterface.prototype.exit = function() {
    // Function called upon exiting this state, right before switching to the next
    throw new Error("Function must be implemented by subclass");
};

FSMStateInterface.prototype.update = function(objRef, dt_s=1.0) {
    // dt_s is delta-time, in seconds. May or may not be necessary.
    throw new Error("Function must be implemented by subclass");
};


FSMStateInterface.prototype.addTransition = function(transition) {
    this.transitions.push(transition);
};

FSMStateInterface.prototype.setTerminal = function() {
    this.isTerminal = true;
};


//// ============================================================================
//// FSM State Class
//// ============================================================================
//// This class is essentially the same as the FSMStateInterface class, but without the "interface" part.
//// The goal is to be able to declare a var, like var myState = new FSMState(), which is possible if we're not implementing an interface
//function FSMState(stateName = null) {
//    this.stateName = stateName;
//    this.isTerminal = false;
//    this.transitions = [];
//    // Note that transitions contain conditions to evaluate, and next-states. If no tests pass, then by default, the state stays the same
//}
//
//FSMState.prototype.enter = function() {
//    // Function called upon entering this state
//};
//
//FSMState.prototype.exit = function() {
//    // Function called upon exiting this state, right before switching to the next
//};
//
//FSMState.prototype.update = function(objRef, dt_s=1.0) {
//    // dt_s is delta-time, in seconds. May or may not be necessary.
//};
//
//
//FSMState.prototype.addTransition = function(transition) {
//    this.transitions.push(transition);
//};
//
//FSMState.prototype.setTerminal = function() {
//    this.isTerminal = true;
//};


// ============================================================================
// FSM Transition Class
// ============================================================================
function FSMTransition(targetName = "", condition=null) {
    this.target_name = targetName;  // A reference to the actual state object
    this.condition = condition;     // The condition here is an instance of one of the FSMCondition classes below
}

FSMTransition.prototype.setTarget = function(targetName) {
    this.target_name = targetName;
};

FSMTransition.prototype.setCondition = function(condition) {
    this.condition = condition;     // Every transition has exactly 1 condition (but the condition itself, can be compound. See ANDList and ORList)
};

FSMTransition.prototype.test = function() {
    return this.condition.test();
};


// ============================================================================
// FSM Condition Interface Classes
// ============================================================================
function FSMConditionInterface(a_obj, a_key, b_obj, b_key) {
    // An interface for conditional testing of object against other objects
    this.objref_a = a_obj;
    this.key_a = a_key;

    this.objref_b = b_obj;
    this.key_b = b_key;
}
FSMConditionInterface.prototype.test = function() {
    throw new Error("Function must be implemented by subclass");
};


function FSMConditionListInterface(condList) {
    // TODO make sure we're properly handling lists - probably need to do a "forced" copy?
    this.condList = condList;
}
FSMConditionListInterface.prototype.test = function() {
    throw new Error("Function must be implemented by subclass");
};


// ============================================================================
// FSM Condition Classes
// ============================================================================
//Test if a > b

//Note: the ctor takes in "dict objs". These objs can be actual dict objects, or DataWrapper objects.
//DataWrappers are wrappers around immutable types (e.g., int, float) that allow "dict-like" access
//to the data value. This allows the program to maintain consisten references to the actual data we
//want to compare
// NOTE: DataWrapper is a "dict-like" object type that was created for a Python game library. A JavaScript equivalent object that is not specifically a "DataWrapper would be an Object like, {"data": 10}.
function FSMConditionGT(a_obj, a_key, b_obj, b_key) {
    FSMConditionInterface.call(this, a_obj, a_key, b_obj, b_key);
}
FSMConditionGT.prototype = Object.create(FSMConditionInterface);
FSMConditionGT.prototype.constructor = FSMConditionGT;
FSMConditionGT.prototype.test = function() {
    return this.objref_a[this.key_a] > this.objref_b[this.key_b];
};


//Test if a >= b

//Note: the ctor takes in "dict objs". These objs can be actual dict objects, or DataWrapper objects.
//DataWrappers are wrappers around immutable types (e.g., int, float) that allow "dict-like" access
//to the data value. This allows the program to maintain consisten references to the actual data we
//want to compare
function FSMConditionGTE(a_obj, a_key, b_obj, b_key) {
    FSMConditionInterface.call(this, a_obj, a_key, b_obj, b_key);
}
FSMConditionGTE.prototype = Object.create(FSMConditionInterface);
FSMConditionGTE.prototype.constructor = FSMConditionGTE;
FSMConditionGTE.prototype.test = function() {
    return this.objref_a[this.key_a] >= this.objref_b[this.key_b];
};


//Test if a < b
//
//Note: the ctor takes in "dict objs". These objs can be actual dict objects, or DataWrapper objects.
//DataWrappers are wrappers around immutable types (e.g., int, float) that allow "dict-like" access
//to the data value. This allows the program to maintain consisten references to the actual data we
//want to compare
function FSMConditionLT(a_obj, a_key, b_obj, b_key) {
    FSMConditionInterface.call(this, a_obj, a_key, b_obj, b_key);
}
FSMConditionLT.prototype = Object.create(FSMConditionInterface);
FSMConditionLT.prototype.constructor = FSMConditionLT;
FSMConditionLT.prototype.test = function() {
    return this.objref_a[this.key_a] < this.objref_b[this.key_b];
};


//Test if a <= b
//
//Note: the ctor takes in "dict objs". These objs can be actual dict objects, or DataWrapper objects.
//DataWrappers are wrappers around immutable types (e.g., int, float) that allow "dict-like" access
//to the data value. This allows the program to maintain consisten references to the actual data we
//want to compare
function FSMConditionLTE(a_obj, a_key, b_obj, b_key) {
    FSMConditionInterface.call(this, a_obj, a_key, b_obj, b_key);
}
FSMConditionLTE.prototype = Object.create(FSMConditionInterface);
FSMConditionLTE.prototype.constructor = FSMConditionLTE;
FSMConditionLTE.prototype.test = function() {
    return this.objref_a[this.key_a] <= this.objref_b[this.key_b];
};


//Test if a == b
//
//Note: the ctor takes in "dict objs". These objs can be actual dict objects, or DataWrapper objects.
//DataWrappers are wrappers around immutable types (e.g., int, float) that allow "dict-like" access
//to the data value. This allows the program to maintain consisten references to the actual data we
//want to compare
function FSMConditionEQ(a_obj, a_key, b_obj, b_key) {
    FSMConditionInterface.call(this, a_obj, a_key, b_obj, b_key);
}
FSMConditionEQ.prototype = Object.create(FSMConditionInterface);
FSMConditionEQ.prototype.constructor = FSMConditionEQ;
FSMConditionEQ.prototype.test = function() {
    return this.objref_a[this.key_a] == this.objref_b[this.key_b];
};


//Test if a != b
//
//Note: the ctor takes in "dict objs". These objs can be actual dict objects, or DataWrapper objects.
//DataWrappers are wrappers around immutable types (e.g., int, float) that allow "dict-like" access
//to the data value. This allows the program to maintain consisten references to the actual data we
//want to compare
function FSMConditionNEQ(a_obj, a_key, b_obj, b_key) {
    FSMConditionInterface.call(this, a_obj, a_key, b_obj, b_key);
}
FSMConditionNEQ.prototype = Object.create(FSMConditionInterface);
FSMConditionNEQ.prototype.constructor = FSMConditionNEQ;
FSMConditionNEQ.prototype.test = function() {
    return this.objref_a[this.key_a] != this.objref_b[this.key_b];
};


//Test if a && b is True
//
//Note: the ctor takes in "dict objs". These objs can be actual dict objects, or DataWrapper objects.
//DataWrappers are wrappers around immutable types (e.g., int, float) that allow "dict-like" access
//to the data value. This allows the program to maintain consisten references to the actual data we
//want to compare
function FSMConditionAND(a_obj, a_key, b_obj, b_key) {
    FSMConditionInterface.call(this, a_obj, a_key, b_obj, b_key);
}
FSMConditionAND.prototype = Object.create(FSMConditionInterface);
FSMConditionAND.prototype.constructor = FSMConditionAND;
FSMConditionAND.prototype.test = function() {
    return this.objref_a[this.key_a] && this.objref_b[this.key_b];
};


//Test if a list of conditions all evaluate to True (can mix and match, and even have nested
//ANDLists or ORLists as items in the list)
//
//Note: the ctor takes in "dict objs". These objs can be actual dict objects, or DataWrapper objects.
//DataWrappers are wrappers around immutable types (e.g., int, float) that allow "dict-like" access
//to the data value. This allows the program to maintain consisten references to the actual data we
//want to compare

function FSMConditionANDList(condList) {
    FSMConditionListInterface.call(this, condList);
}
FSMConditionANDList.prototype = Object.create(FSMConditionListInterface);
FSMConditionANDList.prototype.constructor = FSMConditionANDList;
FSMConditionANDList.prototype.test = function() {
    var result = true;

    for (var cond of this.condList) {
        result = cond.test();
        if (!result) {
            break;
        }
    }
    return result;
};


//Test if a || b is True
//
//Note: the ctor takes in "dict objs". These objs can be actual dict objects, or DataWrapper objects.
//DataWrappers are wrappers around immutable types (e.g., int, float) that allow "dict-like" access
//to the data value. This allows the program to maintain consisten references to the actual data we
//want to compare
function FSMConditionOR(a_obj, a_key, b_obj, b_key) {
    FSMConditionInterface.call(this, a_obj, a_key, b_obj, b_key);
}
FSMConditionOR.prototype = Object.create(FSMConditionInterface);
FSMConditionOR.prototype.constructor = FSMConditionOR;
FSMConditionOR.prototype.test = function() {
    return this.objref_a[this.key_a] || this.objref_b[this.key_b];
};


//Test if any of a list of conditions evaluates to True (can mix and match, and even have ANDLists or
//ORLists as items in the list)
//
//Note: the ctor takes in "dict objs". These objs can be actual dict objects, or DataWrapper objects.
//DataWrappers are wrappers around immutable types (e.g., int, float) that allow "dict-like" access
//to the data value. This allows the program to maintain consisten references to the actual data we
//want to compare
function FSMConditionORList(condList) {
    FSMConditionListInterface.call(this, condList);
}
FSMConditionORList.prototype = Object.create(FSMConditionListInterface);
FSMConditionORList.prototype.constructor = FSMConditionORList;
FSMConditionORList.prototype.test = function() {
    var result = false;

    for (var cond of this.condList) {
        result = cond.test();
        if (result) {
            break;
        }
    }
    return result;
};


// ============================================================================
// Finite State Machine (FSM)
// ============================================================================
function FSM(objRef = null) {
    this.states = {};
    this.init_state = null;
    this.current_state = null;
    this.running = false;
    this.obj_ref = objRef;  // A dict or similar -- contains all the data to be used as inputs to the FSM
    // TODO determine if I need to deepcopy? But maybe not.. But maybe?

}

//Iterate through the transitions of the current state, evaluating the control conditions.
//If no conditions evaluate to True, then by default, stay in the same state.
FSM.prototype.checkTransitions = function() {
   for (var transition of this.current_state.transitions) {
       if (transition.test()) {
           this.current_state.exit();

           this.current_state = this.states[transition.target_name];
           this.current_state.enter();
        }
    }
};


//Update the current state
FSM.prototype.update = function() {
    if (this.running) {
        this.current_state.update(this.obj_ref);    // Optionally supply a dt (delta_time) variable
        if (this.current_state.isTerminal) {  // We run through one update cycle of a terminal state, in case the state wants to do anything useful as clean-up or whatever
            this.running = false;
            this.current_state.exit();  // Exit the terminal state
        }
        this.checkTransitions();
    }
};


//Set the initial state
//NOTE: This function MUST be called before starting the machine
FSM.prototype.setInitState = function(stateName) {
    this.init_state = this.states[stateName];
};


FSM.prototype.addState = function(state) {
    this.states[state.stateName] = state;
};


FSM.prototype.start = function() {
    this.running = true;
    this.current_state = this.init_state;
    this.current_state.enter();
};


FSM.prototype.stop = function() {
    this.running = false;
};

