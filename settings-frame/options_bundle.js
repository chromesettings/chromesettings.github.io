// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// This file exists to aggregate all of the javascript used by the
// settings page into a single file which will be flattened and served
// as a single resource.
// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {

  /////////////////////////////////////////////////////////////////////////////
  // Preferences class:

  /**
   * Preferences class manages access to Chrome profile preferences.
   * @constructor
   * @extends {cr.EventTarget}
   */
  function Preferences() {
    // Map of registered preferences.
    this.registeredPreferences_ = {};
  }

  cr.addSingletonGetter(Preferences);

  /**
   * Sets a Boolean preference and signals its new value.
   * @param {string} name Preference name.
   * @param {boolean} value New preference value.
   * @param {boolean} commit Whether to commit the change to Chrome.
   * @param {string=} opt_metric User metrics identifier.
   */
  Preferences.setBooleanPref = function(name, value, commit, opt_metric) {
    if (!commit) {
      Preferences.getInstance().setPrefNoCommit_(name, 'bool', Boolean(value));
      return;
    }

    var argumentList = [name, Boolean(value)];
    if (opt_metric != undefined) argumentList.push(opt_metric);
    chrome.send('setBooleanPref', argumentList);
  };

  /**
   * Sets an integer preference and signals its new value.
   * @param {string} name Preference name.
   * @param {number} value New preference value.
   * @param {boolean} commit Whether to commit the change to Chrome.
   * @param {string} metric User metrics identifier.
   */
  Preferences.setIntegerPref = function(name, value, commit, metric) {
    if (!commit) {
      Preferences.getInstance().setPrefNoCommit_(name, 'int', Number(value));
      return;
    }

    var argumentList = [name, Number(value)];
    if (metric != undefined) argumentList.push(metric);
    chrome.send('setIntegerPref', argumentList);
  };

  /**
   * Sets a double-valued preference and signals its new value.
   * @param {string} name Preference name.
   * @param {number} value New preference value.
   * @param {boolean} commit Whether to commit the change to Chrome.
   * @param {string} metric User metrics identifier.
   */
  Preferences.setDoublePref = function(name, value, commit, metric) {
    if (!commit) {
      Preferences.getInstance().setPrefNoCommit_(name, 'double', Number(value));
      return;
    }

    var argumentList = [name, Number(value)];
    if (metric != undefined) argumentList.push(metric);
    chrome.send('setDoublePref', argumentList);
  };

  /**
   * Sets a string preference and signals its new value.
   * @param {string} name Preference name.
   * @param {string} value New preference value.
   * @param {boolean} commit Whether to commit the change to Chrome.
   * @param {string} metric User metrics identifier.
   */
  Preferences.setStringPref = function(name, value, commit, metric) {
    if (!commit) {
      Preferences.getInstance().setPrefNoCommit_(name, 'string', String(value));
      return;
    }

    var argumentList = [name, String(value)];
    if (metric != undefined) argumentList.push(metric);
    chrome.send('setStringPref', argumentList);
  };

  /**
   * Sets a string preference that represents a URL and signals its new value.
   * The value will be fixed to be a valid URL when it gets committed to Chrome.
   * @param {string} name Preference name.
   * @param {string} value New preference value.
   * @param {boolean} commit Whether to commit the change to Chrome.
   * @param {string} metric User metrics identifier.
   */
  Preferences.setURLPref = function(name, value, commit, metric) {
    if (!commit) {
      Preferences.getInstance().setPrefNoCommit_(name, 'url', String(value));
      return;
    }

    var argumentList = [name, String(value)];
    if (metric != undefined) argumentList.push(metric);
    chrome.send('setURLPref', argumentList);
  };

  /**
   * Sets a JSON list preference and signals its new value.
   * @param {string} name Preference name.
   * @param {Array} value New preference value.
   * @param {boolean} commit Whether to commit the change to Chrome.
   * @param {string} metric User metrics identifier.
   */
  Preferences.setListPref = function(name, value, commit, metric) {
    if (!commit) {
      Preferences.getInstance().setPrefNoCommit_(name, 'list', value);
      return;
    }

    var argumentList = [name, JSON.stringify(value)];
    if (metric != undefined) argumentList.push(metric);
    chrome.send('setListPref', argumentList);
  };

  /**
   * Clears the user setting for a preference and signals its new effective
   * value.
   * @param {string} name Preference name.
   * @param {boolean} commit Whether to commit the change to Chrome.
   * @param {string=} opt_metric User metrics identifier.
   */
  Preferences.clearPref = function(name, commit, opt_metric) {
    if (!commit) {
      Preferences.getInstance().clearPrefNoCommit_(name);
      return;
    }

    var argumentList = [name];
    if (opt_metric != undefined) argumentList.push(opt_metric);
    chrome.send('clearPref', argumentList);
  };

  Preferences.prototype = {
    __proto__: cr.EventTarget.prototype,

    /**
     * Adds an event listener to the target.
     * @param {string} type The name of the event.
     * @param {EventListenerType} handler The handler for the event. This is
     *     called when the event is dispatched.
     */
    addEventListener: function(type, handler) {
      cr.EventTarget.prototype.addEventListener.call(this, type, handler);
      if (!(type in this.registeredPreferences_))
        this.registeredPreferences_[type] = {};
    },

    /**
     * Initializes preference reading and change notifications.
     */
    initialize: function() {
      var params1 = ['Preferences.prefsFetchedCallback'];
      var params2 = ['Preferences.prefsChangedCallback'];
      for (var prefName in this.registeredPreferences_) {
        params1.push(prefName);
        params2.push(prefName);
      }
      chrome.send('fetchPrefs', params1);
      chrome.send('observePrefs', params2);
    },

    /**
     * Helper function for flattening of dictionary passed via fetchPrefs
     * callback.
     * @param {string} prefix Preference name prefix.
     * @param {Object} dict Map with preference values.
     * @private
     */
    flattenMapAndDispatchEvent_: function(prefix, dict) {
      for (var prefName in dict) {
        var value = dict[prefName];
        if (typeof value == 'object' &&
            !this.registeredPreferences_[prefix + prefName]) {
          this.flattenMapAndDispatchEvent_(prefix + prefName + '.', value);
        } else if (value) {
          var event = new Event(prefix + prefName);
          this.registeredPreferences_[prefix + prefName].orig = value;
          event.value = value;
          this.dispatchEvent(event);
        }
      }
    },

    /**
     * Sets a preference and signals its new value. The change is propagated
     * throughout the UI code but is not committed to Chrome yet. The new value
     * and its data type are stored so that commitPref() can later be used to
     * invoke the appropriate set*Pref() method and actually commit the change.
     * @param {string} name Preference name.
     * @param {string} type Preference data type.
     * @param {*} value New preference value.
     * @private
     */
    setPrefNoCommit_: function(name, type, value) {
      var pref = this.registeredPreferences_[name];
      pref.action = 'set';
      pref.type = type;
      pref.value = value;

      var event = new Event(name);
      // Decorate pref value as CoreOptionsHandler::CreateValueForPref() does.
      event.value = {value: value, uncommitted: true};
      if (pref.orig) {
        event.value.recommendedValue = pref.orig.recommendedValue;
        event.value.disabled = pref.orig.disabled;
      }
      this.dispatchEvent(event);
    },

    /**
     * Clears a preference and signals its new value. The change is propagated
     * throughout the UI code but is not committed to Chrome yet.
     * @param {string} name Preference name.
     * @private
     */
    clearPrefNoCommit_: function(name) {
      var pref = this.registeredPreferences_[name];
      pref.action = 'clear';
      delete pref.type;
      delete pref.value;

      var event = new Event(name);
      // Decorate pref value as CoreOptionsHandler::CreateValueForPref() does.
      event.value = {controlledBy: 'recommended', uncommitted: true};
      if (pref.orig) {
        event.value.value = pref.orig.recommendedValue;
        event.value.recommendedValue = pref.orig.recommendedValue;
        event.value.disabled = pref.orig.disabled;
      }
      this.dispatchEvent(event);
    },

    /**
     * Commits a preference change to Chrome and signals the new preference
     * value. Does nothing if there is no uncommitted change.
     * @param {string} name Preference name.
     * @param {string} metric User metrics identifier.
     */
    commitPref: function(name, metric) {
      var pref = this.registeredPreferences_[name];
      switch (pref.action) {
        case 'set':
          switch (pref.type) {
            case 'bool':
              Preferences.setBooleanPref(name, pref.value, true, metric);
              break;
            case 'int':
              Preferences.setIntegerPref(name, pref.value, true, metric);
              break;
            case 'double':
              Preferences.setDoublePref(name, pref.value, true, metric);
              break;
            case 'string':
              Preferences.setStringPref(name, pref.value, true, metric);
              break;
            case 'url':
              Preferences.setURLPref(name, pref.value, true, metric);
              break;
            case 'list':
              Preferences.setListPref(name, pref.value, true, metric);
              break;
          }
          break;
        case 'clear':
          Preferences.clearPref(name, true, metric);
          break;
      }
      delete pref.action;
      delete pref.type;
      delete pref.value;
    },

    /**
     * Rolls back a preference change and signals the original preference value.
     * Does nothing if there is no uncommitted change.
     * @param {string} name Preference name.
     */
    rollbackPref: function(name) {
      var pref = this.registeredPreferences_[name];
      if (!pref.action)
        return;

      delete pref.action;
      delete pref.type;
      delete pref.value;

      var event = new Event(name);
      event.value = pref.orig || {};
      event.value.uncommitted = true;
      this.dispatchEvent(event);
    }
  };

  /**
   * Callback for fetchPrefs method.
   * @param {Object} dict Map of fetched property values.
   */
  Preferences.prefsFetchedCallback = function(dict) {
    Preferences.getInstance().flattenMapAndDispatchEvent_('', dict);
  };

  /**
   * Callback for observePrefs method.
   * @param {Array} notification An array defining changed preference values.
   *     notification[0] contains name of the change preference while its new
   *     value is stored in notification[1].
   */
  Preferences.prefsChangedCallback = function(notification) {
    var event = new Event(notification[0]);
    event.value = notification[1];
    var prefs = Preferences.getInstance();
    prefs.registeredPreferences_[notification[0]] = {orig: notification[1]};
    if (event.value)
      prefs.dispatchEvent(event);
  };

  // Export
  return {
    Preferences: Preferences
  };

});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /** @const */ var Preferences = options.Preferences;

  /**
   * A controlled setting indicator that can be placed on a setting as an
   * indicator that the value is controlled by some external entity such as
   * policy or an extension.
   * @constructor
   * @extends {cr.ui.ControlledIndicator}
   */
  var ControlledSettingIndicator = cr.ui.define('span');

  ControlledSettingIndicator.prototype = {
    __proto__: cr.ui.ControlledIndicator.prototype,

    /**
     * Decorates the base element to show the proper icon.
     */
    decorate: function() {
      cr.ui.ControlledIndicator.prototype.decorate.call(this);

      // If there is a pref, track its controlledBy and recommendedValue
      // properties in order to be able to bring up the correct bubble.
      if (this.pref) {
        Preferences.getInstance().addEventListener(
            this.pref, this.handlePrefChange.bind(this));
        this.resetHandler = this.clearAssociatedPref_;
      }
    },

    /**
     * The given handler will be called when the user clicks on the 'reset to
     * recommended value' link shown in the indicator bubble. The |this| object
     * will be the indicator itself.
     * @param {function()} handler The handler to be called.
     */
    set resetHandler(handler) {
      this.resetHandler_ = handler;
    },

    /**
     * Clears the preference associated with this indicator.
     * @private
     */
    clearAssociatedPref_: function() {
      Preferences.clearPref(this.pref, !this.dialogPref);
    },

    /**
     * Handle changes to the associated pref by hiding any currently visible
     * bubble and updating the controlledBy property.
     * @param {Event} event Pref change event.
     * @suppress {checkTypes}
     * TODO(vitalyp): remove the suppression. |controlledBy| property is defined
     * by cr.defineProperty(). Currently null can't be assigned to such
     * properties due to implementation of ChromePass.java. See this discussion
     * to change nulls to empty string below:
     * https://chromiumcodereview.appspot.com/11066015/
     */
    handlePrefChange: function(event) {
      PageManager.hideBubble();
      if (event.value.controlledBy) {
        if (!this.value || String(event.value.value) == this.value) {
          this.controlledBy = event.value.controlledBy;
          if (event.value.extension) {
            this.extensionId = event.value.extension.id;
            this.extensionIcon = event.value.extension.icon;
            this.extensionName = event.value.extension.name;
          }
        } else {
          this.controlledBy = null;
        }
      } else if (event.value.recommendedValue != undefined) {
        this.controlledBy =
            !this.value || String(event.value.recommendedValue) == this.value ?
            'hasRecommendation' : null;
      } else {
        this.controlledBy = null;
      }
    },

    /**
     * Uses the page's PageManager to display an informational bubble.
     * @override
     */
    showBubble: function(content) {
      PageManager.showBubble(content, this.image, this, this.location);
    },

    /**
     * Uses the page's PageManager to hide the currently visible bubble, if
     * any.
     * @override
     */
    hideBubble: function() {
      PageManager.hideBubble();
    },

    /**
     * Queries the |loadTimeData| singleton for the default bubble text strings.
     * @override
     */
    getDefaultStrings: function() {
      // Construct the bubble text.
      if (this.hasAttribute('plural')) {
        var defaultStrings = {
          'policy': loadTimeData.getString('controlledSettingsPolicy'),
          'extension': loadTimeData.getString('controlledSettingsExtension'),
          'extensionWithName':
              loadTimeData.getString('controlledSettingsExtensionWithName'),
        };
        if (cr.isChromeOS) {
          defaultStrings.shared =
              loadTimeData.getString('controlledSettingsShared');
        }
      } else {
        var defaultStrings = {
          'policy': loadTimeData.getString('controlledSettingPolicy'),
          'extension': loadTimeData.getString('controlledSettingExtension'),
          'extensionWithName':
              loadTimeData.getString('controlledSettingExtensionWithName'),
          'recommended': loadTimeData.getString('controlledSettingRecommended'),
          'hasRecommendation':
              loadTimeData.getString('controlledSettingHasRecommendation'),
        };
        if (cr.isChromeOS) {
          defaultStrings.owner =
              loadTimeData.getString('controlledSettingOwner');
          defaultStrings.shared =
              loadTimeData.getString('controlledSettingShared');
        }
      }
      return defaultStrings;
    },

    /**
     * Returns the DOM tree for a showing the message |text|.
     * @param {string} text to be shown in the bubble.
     * @override
     */
    createDomTree: function(text) {
      var content = document.createElement('div');
      content.classList.add('controlled-setting-bubble-header');
      content.textContent = text;

      if (this.controlledBy == 'hasRecommendation' && this.resetHandler_ &&
          !this.readOnly) {
        var container = document.createElement('div');
        var action = new ActionLink;
        action.classList.add('controlled-setting-bubble-action');
        action.textContent =
            loadTimeData.getString('controlledSettingFollowRecommendation');
        action.addEventListener('click', this.resetHandler_.bind(this));
        container.appendChild(action);
        content.appendChild(container);
      } else if (this.controlledBy == 'extension' && this.extensionName) {
        var extensionContainer =
            $('extension-controlled-settings-bubble-template').cloneNode(true);
        // No need for an id anymore, and thus remove to avoid id collision.
        extensionContainer.removeAttribute('id');
        extensionContainer.hidden = false;

        var extensionName = extensionContainer.querySelector(
            '.controlled-setting-bubble-extension-name');
        extensionName.textContent = this.extensionName;
        extensionName.style.backgroundImage =
            'url("' + this.extensionIcon + '")';

        var manageLink = extensionContainer.querySelector(
            '.controlled-setting-bubble-extension-manage-link');
        var extensionId = this.extensionId;
        manageLink.onclick = function() {
          uber.invokeMethodOnWindow(
              window.top, 'showPage',
              {pageId: 'extensions', path: '?id=' + extensionId});
        };

        var disableButton = extensionContainer.querySelector(
            '.controlled-setting-bubble-extension-disable-button');
        disableButton.onclick =
            function() { chrome.send('disableExtension', [extensionId]); };
        content.appendChild(extensionContainer);
      }
      return content;
    },
  };

  /**
   * The name of the associated preference.
   */
  cr.defineProperty(ControlledSettingIndicator, 'pref', cr.PropertyKind.ATTR);

  /**
   * Whether this indicator is part of a dialog. If so, changes made to the
   * associated preference take effect in the settings UI immediately but are
   * only actually committed when the user confirms the dialog. If the user
   * cancels the dialog instead, the changes are rolled back in the settings UI
   * and never committed.
   */
  cr.defineProperty(ControlledSettingIndicator, 'dialogPref',
                    cr.PropertyKind.BOOL_ATTR);

  /**
   * The value of the associated preference that the indicator represents. If
   * this is not set, the indicator will be visible whenever any value is
   * enforced or recommended. If it is set, the indicator will be visible only
   * when the enforced or recommended value matches the value it represents.
   * This allows multiple indicators to be created for a set of radio buttons,
   * ensuring that only one of them is visible at a time.
   */
  cr.defineProperty(ControlledSettingIndicator, 'value',
                    cr.PropertyKind.ATTR);

  // Export.
  return {
    ControlledSettingIndicator: ControlledSettingIndicator
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /** @const */ var List = cr.ui.List;
  /** @const */ var ListItem = cr.ui.ListItem;

  /**
   * Creates a deletable list item, which has a button that will trigger a call
   * to deleteItemAtIndex(index) in the list.
   * @constructor
   * @extends {cr.ui.ListItem}
   */
  var DeletableItem = cr.ui.define('li');

  DeletableItem.prototype = {
    __proto__: ListItem.prototype,

    /**
     * The element subclasses should populate with content.
     * @type {HTMLElement}
     * @private
     */
    contentElement_: null,

    /**
     * The close button element.
     * @type {HTMLElement}
     * @private
     */
    closeButtonElement_: null,

    /**
     * Whether or not this item can be deleted.
     * @type {boolean}
     * @private
     */
    deletable_: true,

    /**
     * Whether or not the close button can ever be navigated to using the
     * keyboard.
     * @type {boolean}
     * @protected
     */
    closeButtonFocusAllowed: false,

    /** @override */
    decorate: function() {
      ListItem.prototype.decorate.call(this);

      this.classList.add('deletable-item');

      this.contentElement_ = /** @type {HTMLElement} */(
          this.ownerDocument.createElement('div'));
      this.appendChild(this.contentElement_);

      this.closeButtonElement_ = /** @type {HTMLElement} */(
          this.ownerDocument.createElement('button'));
      this.closeButtonElement_.className =
          'raw-button row-delete-button custom-appearance';
      this.closeButtonElement_.addEventListener('mousedown',
                                                this.handleMouseDownUpOnClose_);
      this.closeButtonElement_.addEventListener('mouseup',
                                                this.handleMouseDownUpOnClose_);
      this.closeButtonElement_.addEventListener('focus',
                                                this.handleFocus.bind(this));
      this.closeButtonElement_.tabIndex = -1;
      this.closeButtonElement_.title =
          loadTimeData.getString('deletableItemDeleteButtonTitle');
      this.appendChild(this.closeButtonElement_);
    },

    /**
     * Returns the element subclasses should add content to.
     * @return {HTMLElement} The element subclasses should popuplate.
     */
    get contentElement() {
      return this.contentElement_;
    },

    /**
     * Returns the close button element.
     * @return {HTMLElement} The close |<button>| element.
     */
    get closeButtonElement() {
      return this.closeButtonElement_;
    },

    /* Gets/sets the deletable property. An item that is not deletable doesn't
     * show the delete button (although space is still reserved for it).
     */
    get deletable() {
      return this.deletable_;
    },
    set deletable(value) {
      this.deletable_ = value;
      this.closeButtonElement_.disabled = !value;
    },

    /**
     * Called when a focusable child element receives focus. Selects this item
     * in the list selection model.
     * @protected
     */
    handleFocus: function() {
      // This handler is also fired when the child receives focus as a result of
      // the item getting selected by the customized mouse/keyboard handling in
      // SelectionController. Take care not to destroy a potential multiple
      // selection in this case.
      if (this.selected)
        return;

      var list = this.parentNode;
      var index = list.getIndexOfListItem(this);
      list.selectionModel.selectedIndex = index;
      list.selectionModel.anchorIndex = index;
    },

    /**
     * Don't let the list have a crack at the event. We don't want clicking the
     * close button to change the selection of the list or to focus on the close
     * button.
     * @param {Event} e The mouse down/up event object.
     * @private
     */
    handleMouseDownUpOnClose_: function(e) {
      if (e.target.disabled)
        return;
      e.stopPropagation();
      e.preventDefault();
    },
  };

  /**
   * @constructor
   * @extends {cr.ui.List}
   */
  var DeletableItemList = cr.ui.define('list');

  DeletableItemList.prototype = {
    __proto__: List.prototype,

    /** @override */
    decorate: function() {
      List.prototype.decorate.call(this);
      this.addEventListener('click', this.handleClick);
      this.addEventListener('keydown', this.handleKeyDown_);
    },

    /**
     * Callback for onclick events.
     * @param {Event} e The click event object.
     * @protected
     */
    handleClick: function(e) {
      if (this.disabled)
        return;

      var target = e.target;
      if (target.classList.contains('row-delete-button')) {
        var listItem = this.getListItemAncestor(
            /** @type {HTMLElement} */(target));
        var idx = this.getIndexOfListItem(listItem);
        this.deleteItemAtIndex(idx);
      }
    },

    /**
     * Callback for keydown events.
     * @param {Event} e The keydown event object.
     * @private
     */
    handleKeyDown_: function(e) {
      // Map delete (and backspace on Mac) to item deletion (unless focus is
      // in an input field, where it's intended for text editing).
      if ((e.keyCode == 46 || (e.keyCode == 8 && cr.isMac)) &&
          e.target.tagName != 'INPUT') {
        this.deleteSelectedItems_();
        // Prevent the browser from going back.
        e.preventDefault();
      }
    },

    /**
     * Deletes all the currently selected items that are deletable.
     * @private
     */
    deleteSelectedItems_: function() {
      var selected = this.selectionModel.selectedIndexes;
      // Reverse through the list of selected indexes to maintain the
      // correct index values after deletion.
      for (var j = selected.length - 1; j >= 0; j--) {
        var index = selected[j];
        if (this.getListItemByIndex(index).deletable)
          this.deleteItemAtIndex(index);
      }
    },

    /**
     * Called when an item should be deleted; subclasses are responsible for
     * implementing.
     * @param {number} index The index of the item that is being deleted.
     */
    deleteItemAtIndex: function(index) {
    },
  };

  return {
    DeletableItemList: DeletableItemList,
    DeletableItem: DeletableItem,
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /**
   * @constructor
   * @extends {HTMLDivElement}
   */
  var EditableTextField = cr.ui.define('div');

  EditableTextField.prototype = {
    __proto__: HTMLDivElement.prototype,

    /**
     * The actual input element in this field.
     * @type {?HTMLElement}
     * @private
     */
    editField_: null,

    /**
     * The static text displayed when this field isn't editable.
     * @type {?HTMLElement}
     * @private
     */
    staticText_: null,

    /**
     * The data model for this field.
     * @type {?Object}
     * @private
     */
    model_: null,

    /**
     * Whether or not the current edit should be considered canceled, rather
     * than committed, when editing ends.
     * @type {boolean}
     * @private
     */
    editCanceled_: true,

    /** @protected */
    decorate: function() {
      this.classList.add('editable-text-field');

      this.createEditableTextCell('');

      if (this.hasAttribute('i18n-placeholder-text')) {
        var identifier = this.getAttribute('i18n-placeholder-text');
        var localizedText = loadTimeData.getString(identifier);
        if (localizedText)
          this.setAttribute('placeholder-text', localizedText);
      }

      this.addEventListener('keydown', this.handleKeyDown_);
      this.editField_.addEventListener('focus', this.handleFocus_.bind(this));
      this.editField_.addEventListener('blur', this.handleBlur_.bind(this));
      this.checkForEmpty_();
    },

    /**
     * Indicates that this field has no value in the model, and the placeholder
     * text (if any) should be shown.
     * @type {boolean}
     */
    get empty() {
      return this.hasAttribute('empty');
    },

    /**
     * The placeholder text to be used when the model or its value is empty.
     * @type {string}
     */
    get placeholderText() {
      return this.getAttribute('placeholder-text');
    },
    set placeholderText(text) {
      if (text)
        this.setAttribute('placeholder-text', text);
      else
        this.removeAttribute('placeholder-text');

      this.checkForEmpty_();
    },

    /**
     * Returns the input element in this text field.
     * @type {HTMLElement} The element that is the actual input field.
     */
    get editField() {
      return this.editField_;
    },

    /**
     * Whether the user is currently editing the list item.
     * @type {boolean}
     */
    get editing() {
      return this.hasAttribute('editing');
    },
    set editing(editing) {
      if (this.editing == editing)
        return;

      if (editing)
        this.setAttribute('editing', '');
      else
        this.removeAttribute('editing');

      if (editing) {
        this.editCanceled_ = false;

        if (this.empty) {
          this.removeAttribute('empty');
          if (this.editField)
            this.editField.value = '';
        }
        if (this.editField) {
          this.editField.focus();
          this.editField.select();
        }
      } else {
        if (!this.editCanceled_ && this.hasBeenEdited &&
            this.currentInputIsValid) {
          this.updateStaticValues_();
          cr.dispatchSimpleEvent(this, 'commitedit', true);
        } else {
          this.resetEditableValues_();
          cr.dispatchSimpleEvent(this, 'canceledit', true);
        }
        this.checkForEmpty_();
      }
    },

    /**
     * Whether the item is editable.
     * @type {boolean}
     */
    get editable() {
      return this.hasAttribute('editable');
    },
    set editable(editable) {
      if (this.editable == editable)
        return;

      if (editable)
        this.setAttribute('editable', '');
      else
        this.removeAttribute('editable');
      this.editable_ = editable;
    },

    /**
     * The data model for this field.
     * @type {Object}
     */
    get model() {
      return this.model_;
    },
    set model(model) {
      this.model_ = model;
      this.checkForEmpty_();  // This also updates the editField value.
      this.updateStaticValues_();
    },

    /**
     * The HTML element that should have focus initially when editing starts,
     * if a specific element wasn't clicked. Defaults to the first <input>
     * element; can be overridden by subclasses if a different element should be
     * focused.
     * @type {?HTMLElement}
     */
    get initialFocusElement() {
      return this.querySelector('input');
    },

    /**
     * Whether the input in currently valid to submit. If this returns false
     * when editing would be submitted, either editing will not be ended,
     * or it will be cancelled, depending on the context. Can be overridden by
     * subclasses to perform input validation.
     * @type {boolean}
     */
    get currentInputIsValid() {
      return true;
    },

    /**
     * Returns true if the item has been changed by an edit. Can be overridden
     * by subclasses to return false when nothing has changed to avoid
     * unnecessary commits.
     * @type {boolean}
     */
    get hasBeenEdited() {
      return true;
    },

    /**
     * Mutates the input during a successful commit.  Can be overridden to
     * provide a way to "clean up" valid input so that it conforms to a
     * desired format.  Will only be called when commit succeeds for valid
     * input, or when the model is set.
     * @param {string} value Input text to be mutated.
     * @return {string} mutated text.
     */
    mutateInput: function(value) {
      return value;
    },

    /**
     * Creates a div containing an <input>, as well as static text, keeping
     * references to them so they can be manipulated.
     * @param {string} text The text of the cell.
     * @private
     */
    createEditableTextCell: function(text) {
      // This function should only be called once.
      if (this.editField_)
        return;

      var container = this.ownerDocument.createElement('div');

      var textEl = /** @type {HTMLElement} */(
          this.ownerDocument.createElement('div'));
      textEl.className = 'static-text';
      textEl.textContent = text;
      textEl.setAttribute('displaymode', 'static');
      this.appendChild(textEl);
      this.staticText_ = textEl;

      var inputEl = /** @type {HTMLElement} */(
          this.ownerDocument.createElement('input'));
      inputEl.className = 'editable-text';
      inputEl.type = 'text';
      inputEl.value = text;
      inputEl.setAttribute('displaymode', 'edit');
      inputEl.staticVersion = textEl;
      this.appendChild(inputEl);
      this.editField_ = inputEl;
    },

    /**
     * Resets the editable version of any controls created by
     * createEditableTextCell to match the static text.
     * @private
     */
    resetEditableValues_: function() {
      var editField = this.editField_;
      var staticLabel = editField.staticVersion;
      if (!staticLabel)
        return;

      if (editField instanceof HTMLInputElement)
        editField.value = staticLabel.textContent;

      editField.setCustomValidity('');
    },

    /**
     * Sets the static version of any controls created by createEditableTextCell
     * to match the current value of the editable version. Called on commit so
     * that there's no flicker of the old value before the model updates.  Also
     * updates the model's value with the mutated value of the edit field.
     * @private
     */
    updateStaticValues_: function() {
      var editField = this.editField_;
      var staticLabel = editField.staticVersion;
      if (!staticLabel)
        return;

      if (editField instanceof HTMLInputElement) {
        staticLabel.textContent = editField.value;
        this.model_.value = this.mutateInput(editField.value);
      }
    },

    /**
     * Checks to see if the model or its value are empty.  If they are, then set
     * the edit field to the placeholder text, if any, and if not, set it to the
     * model's value.
     * @private
     */
    checkForEmpty_: function() {
      var editField = this.editField_;
      if (!editField)
        return;

      if (!this.model_ || !this.model_.value) {
        this.setAttribute('empty', '');
        editField.value = this.placeholderText || '';
      } else {
        this.removeAttribute('empty');
        editField.value = this.model_.value;
      }
    },

    /**
     * Called when this widget receives focus.
     * @param {Event} e the focus event.
     * @private
     */
    handleFocus_: function(e) {
      if (this.editing)
        return;

      this.editing = true;
      if (this.editField_)
        this.editField_.focus();
    },

    /**
     * Called when this widget loses focus.
     * @param {Event} e the blur event.
     * @private
     */
    handleBlur_: function(e) {
      if (!this.editing)
        return;

      this.editing = false;
    },

    /**
     * Called when a key is pressed. Handles committing and canceling edits.
     * @param {Event} e The key down event.
     * @private
     */
    handleKeyDown_: function(e) {
      if (!this.editing)
        return;

      var endEdit;
      switch (e.keyIdentifier) {
        case 'U+001B':  // Esc
          this.editCanceled_ = true;
          endEdit = true;
          break;
        case 'Enter':
          if (this.currentInputIsValid)
            endEdit = true;
          break;
      }

      if (endEdit) {
        // Blurring will trigger the edit to end.
        this.ownerDocument.activeElement.blur();
        // Make sure that handled keys aren't passed on and double-handled.
        // (e.g., esc shouldn't both cancel an edit and close a subpage)
        e.stopPropagation();
      }
    },
  };

  /**
   * Takes care of committing changes to EditableTextField items when the
   * window loses focus.
   */
  window.addEventListener('blur', function(e) {
    var itemAncestor = findAncestor(document.activeElement, function(node) {
      return node instanceof EditableTextField;
    });
    if (itemAncestor)
      document.activeElement.blur();
  });

  return {
    EditableTextField: EditableTextField,
  };
});

// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /** @const */ var ControlledSettingIndicator =
                    options.ControlledSettingIndicator;

  /**
   * A variant of the {@link ControlledSettingIndicator} that shows the status
   * of the hotword search setting, including a bubble to show setup errors
   * (such as failures to download extension resources).
   * @constructor
   * @extends {options.ControlledSettingIndicator}
   */
  var HotwordSearchSettingIndicator = cr.ui.define('span');

  HotwordSearchSettingIndicator.prototype = {
    __proto__: ControlledSettingIndicator.prototype,

    /**
     * Decorates the base element to show the proper icon.
     * @override
     */
    decorate: function() {
      ControlledSettingIndicator.prototype.decorate.call(this);
      this.hidden = true;
    },

    /**
     * Handle changes to the associated pref by hiding any currently visible
     * bubble.
     * @param {Event} event Pref change event.
     * @override
     */
    handlePrefChange: function(event) {
      PageManager.hideBubble();
    },

    /**
     * Sets the variable tracking the section which becomes disabled if an
     * error exists.
     * @param {HTMLElement} section The section to disable.
     */
    set disabledOnErrorSection(section) {
      // TODO(kcarattini): Instead of this, add a cr.EventTarget and have
      // the element to disable register an event on it.
      this.disabledOnErrorSection_ = section;
    },

    /**
     * Returns the current error.
     * @return {string} The error message to be displayed. May be undefined if
     *     there is no error.
     */
    get errorText() {
      return this.errorText_;
    },

    /**
     * Checks for errors and records them.
     * @param {string} errorMsg The error message to be displayed. May be
     *     undefined if there is no error.
     */
    setError: function(errorMsg) {
      this.setAttribute('controlled-by', 'policy');
      this.errorText_ = errorMsg;
    },

    /**
     * Changes the display to be visible if there are errors and disables
     * the section.
     */
    updateBasedOnError: function() {
      if (this.errorText_)
        this.hidden = false;
      if (this.disabledOnErrorSection_)
        this.disabledOnErrorSection_.disabled = !!this.errorText_;
    },

    /**
     * Toggles showing and hiding the error message bubble. An empty
     * |errorText_| indicates that there is no error message. So the bubble
     * only be shown if |errorText_| has a value.
     * @override
     */
    toggleBubble: function() {
      if (this.showingBubble) {
        PageManager.hideBubble();
        return;
      }

      if (!this.errorText_)
        return;

      var self = this;
      // Create the DOM tree for the bubble content.
      var closeButton = document.createElement('div');
      closeButton.classList.add('close-button');

      var text = document.createElement('p');
      text.innerHTML = this.errorText_;

      var textDiv = document.createElement('div');
      textDiv.appendChild(text);

      var container = document.createElement('div');
      container.appendChild(closeButton);
      container.appendChild(textDiv);

      var content = document.createElement('div');
      content.appendChild(container);

      PageManager.showBubble(content, this.image, this, this.location);
    },
  };

  // Export
  return {
    HotwordSearchSettingIndicator: HotwordSearchSettingIndicator
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /** @const */ var DeletableItem = options.DeletableItem;
  /** @const */ var DeletableItemList = options.DeletableItemList;

  /**
   * Creates a new list item with support for inline editing.
   * @constructor
   * @extends {options.DeletableItem}
   */
  function InlineEditableItem() {
    var el = cr.doc.createElement('div');
    InlineEditableItem.decorate(el);
    return el;
  }

  /**
   * Decorates an element as a inline-editable list item. Note that this is
   * a subclass of DeletableItem.
   * @param {!HTMLElement} el The element to decorate.
   */
  InlineEditableItem.decorate = function(el) {
    el.__proto__ = InlineEditableItem.prototype;
    el.decorate();
  };

  InlineEditableItem.prototype = {
    __proto__: DeletableItem.prototype,

    /**
     * Index of currently focused column, or -1 for none.
     * @type {number}
     */
    focusedColumnIndex: -1,

    /**
     * Whether or not this item can be edited.
     * @type {boolean}
     * @private
     */
    editable_: true,

    /**
     * Whether or not this is a placeholder for adding a new item.
     * @type {boolean}
     * @private
     */
    isPlaceholder_: false,

    /**
     * Fields associated with edit mode.
     * @type {Array}
     * @private
     */
    editFields_: null,

    /**
     * Whether or not the current edit should be considered cancelled, rather
     * than committed, when editing ends.
     * @type {boolean}
     * @private
     */
    editCancelled_: true,

    /**
     * The editable item corresponding to the last click, if any. Used to decide
     * initial focus when entering edit mode.
     * @type {HTMLElement}
     * @private
     */
    editClickTarget_: null,

    /** @override */
    decorate: function() {
      DeletableItem.prototype.decorate.call(this);

      this.editFields_ = [];
      this.addEventListener('mousedown', this.handleMouseDown_);
      this.addEventListener('keydown', this.handleKeyDown_);
      this.addEventListener('focusin', this.handleFocusIn_);
    },

    /** @override */
    selectionChanged: function() {
      if (!this.parentNode.ignoreChangeEvents_)
        this.updateEditState();
    },

    /**
     * Called when this element gains or loses 'lead' status. Updates editing
     * mode accordingly.
     */
    updateLeadState: function() {
      // Add focusability before call to updateEditState.
      if (this.lead) {
        this.setEditableValuesFocusable(true);
        this.setCloseButtonFocusable(true);
      }

      this.updateEditState();

      // Remove focusability after call to updateEditState.
      this.setStaticValuesFocusable(false);
      if (!this.lead) {
        this.setEditableValuesFocusable(false);
        this.setCloseButtonFocusable(false);
      }
    },

    /**
     * Updates the edit state based on the current selected and lead states.
     */
    updateEditState: function() {
      if (this.editable)
        this.editing = this.selected && this.lead;
    },

    /**
     * Whether the user is currently editing the list item.
     * @type {boolean}
     */
    get editing() {
      return this.hasAttribute('editing');
    },
    set editing(editing) {
      if (this.editing == editing)
        return;

      if (editing)
        this.setAttribute('editing', '');
      else
        this.removeAttribute('editing');

      if (editing) {
        this.editCancelled_ = false;

        cr.dispatchSimpleEvent(this, 'edit', true);

        var isMouseClick = this.editClickTarget_;
        var focusElement = this.getEditFocusElement_();
        if (focusElement) {
          if (isMouseClick) {
            // Delay focus to fix http://crbug.com/436789
            setTimeout(function() {
              this.focusAndMaybeSelect_(focusElement);
            }.bind(this), 0);
          } else {
            this.focusAndMaybeSelect_(focusElement);
          }
        }
      } else {
        if (!this.editCancelled_ && this.hasBeenEdited &&
            this.currentInputIsValid) {
          this.parentNode.needsToFocusPlaceholder_ = this.isPlaceholder &&
              this.parentNode.shouldFocusPlaceholderOnEditCommit();
          this.updateStaticValues_();
          cr.dispatchSimpleEvent(this, 'commitedit', true);
        } else {
          this.parentNode.needsToFocusPlaceholder_ = false;
          this.resetEditableValues_();
          cr.dispatchSimpleEvent(this, 'canceledit', true);
        }
      }
    },

    /**
     * Return editable element that should be focused, or null for none.
     * @private
     */
    getEditFocusElement_: function() {
      // If an edit field was clicked on then use the clicked element.
      if (this.editClickTarget_) {
        var result = this.editClickTarget_;
        this.editClickTarget_ = null;
        return result;
      }

      // If focusedColumnIndex is valid then use the element in that column.
      if (this.focusedColumnIndex != -1) {
        var nearestColumn =
            this.getNearestColumnByIndex_(this.focusedColumnIndex);
        if (nearestColumn)
          return nearestColumn;
      }

      // It's possible that focusedColumnIndex hasn't been updated yet.
      // Check getFocusedColumnIndex_ directly.
      // This can't completely replace the above focusedColumnIndex check
      // because InlineEditableItemList may have set focusedColumnIndex to a
      // different value.
      var columnIndex = this.getFocusedColumnIndex_();
      if (columnIndex != -1) {
        var nearestColumn = this.getNearestColumnByIndex_(columnIndex);
        if (nearestColumn)
          return nearestColumn;
      }

      // Everything else failed so return the default.
      return this.initialFocusElement;
    },

    /**
     * Focus on the specified element, and select the editable text in it
     * if possible.
     * @param {!Element} control An element to be focused.
     * @private
     */
    focusAndMaybeSelect_: function(control) {
      control.focus();
      if (control.tagName == 'INPUT')
        control.select();
    },

    /**
     * Whether the item is editable.
     * @type {boolean}
     */
    get editable() {
      return this.editable_;
    },
    set editable(editable) {
      this.editable_ = editable;
      if (!editable)
        this.editing = false;
    },

    /**
     * Whether the item is a new item placeholder.
     * @type {boolean}
     */
    get isPlaceholder() {
      return this.isPlaceholder_;
    },
    set isPlaceholder(isPlaceholder) {
      this.isPlaceholder_ = isPlaceholder;
      if (isPlaceholder)
        this.deletable = false;
    },

    /**
     * The HTML element that should have focus initially when editing starts,
     * if a specific element wasn't clicked.
     * Defaults to the first <input> element; can be overridden by subclasses if
     * a different element should be focused.
     * @type {HTMLElement}
     */
    get initialFocusElement() {
      return this.contentElement.querySelector('input');
    },

    /**
     * Whether the input in currently valid to submit. If this returns false
     * when editing would be submitted, either editing will not be ended,
     * or it will be cancelled, depending on the context.
     * Can be overridden by subclasses to perform input validation.
     * @type {boolean}
     */
    get currentInputIsValid() {
      return true;
    },

    /**
     * Returns true if the item has been changed by an edit.
     * Can be overridden by subclasses to return false when nothing has changed
     * to avoid unnecessary commits.
     * @type {boolean}
     */
    get hasBeenEdited() {
      return true;
    },

    /**
     * Sets whether the editable values can be given focus using the keyboard.
     * @param {boolean} focusable The desired focusable state.
     */
    setEditableValuesFocusable: function(focusable) {
      focusable = focusable && this.editable;
      var editFields = this.editFields_;
      for (var i = 0; i < editFields.length; i++) {
        editFields[i].tabIndex = focusable ? 0 : -1;
      }
    },

    /**
     * Sets whether the static values can be given focus using the keyboard.
     * @param {boolean} focusable The desired focusable state.
     */
    setStaticValuesFocusable: function(focusable) {
      var editFields = this.editFields_;
      for (var i = 0; i < editFields.length; i++) {
        var staticVersion = editFields[i].staticVersion;
        if (!staticVersion)
          continue;
        if (this.editable) {
          staticVersion.tabIndex = focusable ? 0 : -1;
        } else {
          // staticVersion remains visible when !this.editable. Remove
          // tabindex so that it will not become focused by clicking on it and
          // have selection box drawn around it.
          staticVersion.removeAttribute('tabindex');
        }
      }
    },

    /**
     * Sets whether the close button can be focused using the keyboard.
     * @param {boolean} focusable The desired focusable state.
     */
    setCloseButtonFocusable: function(focusable) {
      this.closeButtonElement.tabIndex =
          focusable && this.closeButtonFocusAllowed ? 0 : -1;
    },

    /**
     * Returns a div containing an <input>, as well as static text if
     * isPlaceholder is not true.
     * @param {string} text The text of the cell.
     * @return {HTMLElement} The HTML element for the cell.
     * @private
     */
    createEditableTextCell: function(text) {
      var container = /** @type {HTMLElement} */(
          this.ownerDocument.createElement('div'));
      var textEl = null;
      if (!this.isPlaceholder) {
        textEl = this.ownerDocument.createElement('div');
        textEl.className = 'static-text';
        textEl.textContent = text;
        textEl.setAttribute('displaymode', 'static');
        container.appendChild(textEl);
      }

      var inputEl = this.ownerDocument.createElement('input');
      inputEl.type = 'text';
      inputEl.value = text;
      if (!this.isPlaceholder)
        inputEl.setAttribute('displaymode', 'edit');

      // In some cases 'focus' event may arrive before 'input'.
      // To make sure revalidation is triggered we postpone 'focus' handling.
      var handler = this.handleFocus.bind(this);
      inputEl.addEventListener('focus', function() {
        window.setTimeout(function() {
          if (inputEl.ownerDocument.activeElement == inputEl)
            handler();
        }, 0);
      });
      container.appendChild(inputEl);
      this.addEditField(inputEl, textEl);

      return container;
    },

    /**
     * Register an edit field.
     * @param {!Element} control An editable element. It's a form control
     *     element typically.
     * @param {Element} staticElement An element representing non-editable
     *     state.
     */
    addEditField: function(control, staticElement) {
      control.staticVersion = staticElement;
      if (this.editable)
        control.tabIndex = -1;

      if (control.staticVersion) {
        if (this.editable)
          control.staticVersion.tabIndex = -1;
        control.staticVersion.editableVersion = control;
        control.staticVersion.addEventListener('focus',
                                               this.handleFocus.bind(this));
      }
      this.editFields_.push(control);
    },

    /**
     * Set the column index for a child element of this InlineEditableItem.
     * Only elements with a column index will be keyboard focusable, e.g. by
     * pressing the tab key.
     * @param {Element} element Element whose column index to set. Method does
     *     nothing if element is null.
     * @param {number} columnIndex The new column index to set on the element.
     *     -1 removes the column index.
     */
    setFocusableColumnIndex: function(element, columnIndex) {
      if (!element)
        return;

      if (columnIndex >= 0)
        element.setAttribute('inlineeditable-column', columnIndex);
      else
        element.removeAttribute('inlineeditable-column');
    },

    /**
     * Resets the editable version of any controls created by createEditable*
     * to match the static text.
     * @private
     */
    resetEditableValues_: function() {
      var editFields = this.editFields_;
      for (var i = 0; i < editFields.length; i++) {
        var staticLabel = editFields[i].staticVersion;
        if (!staticLabel && !this.isPlaceholder)
          continue;

        if (editFields[i].tagName == 'INPUT') {
          editFields[i].value =
            this.isPlaceholder ? '' : staticLabel.textContent;
        }
        // Add more tag types here as new createEditable* methods are added.

        editFields[i].setCustomValidity('');
      }
    },

    /**
     * Sets the static version of any controls created by createEditable*
     * to match the current value of the editable version. Called on commit so
     * that there's no flicker of the old value before the model updates.
     * @private
     */
    updateStaticValues_: function() {
      var editFields = this.editFields_;
      for (var i = 0; i < editFields.length; i++) {
        var staticLabel = editFields[i].staticVersion;
        if (!staticLabel)
          continue;

        if (editFields[i].tagName == 'INPUT')
          staticLabel.textContent = editFields[i].value;
        // Add more tag types here as new createEditable* methods are added.
      }
    },

    /**
     * Returns the index of the column that currently has focus, or -1 if no
     * column has focus.
     * @return {number}
     * @private
     */
    getFocusedColumnIndex_: function() {
      var element = document.activeElement.editableVersion ||
                    document.activeElement;

      if (element.hasAttribute('inlineeditable-column'))
        return parseInt(element.getAttribute('inlineeditable-column'), 10);
      return -1;
    },

    /**
     * Returns the element from the column that has the largest index where:
     * where:
     *   + index <= startIndex, and
     *   + the element exists, and
     *   + the element is not disabled
     * @return {Element}
     * @private
     */
    getNearestColumnByIndex_: function(startIndex) {
      for (var i = startIndex; i >= 0; --i) {
        var el = this.querySelector('[inlineeditable-column="' + i + '"]');
        if (el && !el.disabled)
          return el;
      }
      return null;
    },

    /**
     * Called when a key is pressed. Handles committing and canceling edits.
     * @param {Event} e The key down event.
     * @private
     */
    handleKeyDown_: function(e) {
      if (!this.editing)
        return;

      var endEdit = false;
      var handledKey = true;
      switch (e.keyIdentifier) {
        case 'U+001B':  // Esc
          this.editCancelled_ = true;
          endEdit = true;
          break;
        case 'Enter':
          if (this.currentInputIsValid)
            endEdit = true;
          break;
        default:
          handledKey = false;
      }
      if (handledKey) {
        // Make sure that handled keys aren't passed on and double-handled.
        // (e.g., esc shouldn't both cancel an edit and close a subpage)
        e.stopPropagation();
      }
      if (endEdit) {
        // Blurring will trigger the edit to end; see InlineEditableItemList.
        this.ownerDocument.activeElement.blur();
      }
    },

    /**
     * Called when the list item is clicked. If the click target corresponds to
     * an editable item, stores that item to focus when edit mode is started.
     * @param {Event} e The mouse down event.
     * @private
     */
    handleMouseDown_: function(e) {
      if (!this.editable)
        return;

      var clickTarget = e.target;
      var editFields = this.editFields_;
      var editClickTarget;
      for (var i = 0; i < editFields.length; i++) {
        if (editFields[i] == clickTarget ||
            editFields[i].staticVersion == clickTarget) {
          editClickTarget = editFields[i];
          break;
        }
      }

      if (this.editing) {
        if (!editClickTarget) {
          // Clicked on the list item outside of an edit field. Don't lose focus
          // from currently selected edit field.
          e.stopPropagation();
          e.preventDefault();
        }
        return;
      }

      if (editClickTarget && !editClickTarget.disabled)
        this.editClickTarget_ = editClickTarget;
    },

    /**
     * Called when this InlineEditableItem or any of its children are given
     * focus. Updates focusedColumnIndex with the index of the newly focused
     * column, or -1 if the focused element does not have a column index.
     * @param {Event} e The focusin event.
     * @private
     */
    handleFocusIn_: function(e) {
      var target = e.target.editableVersion || e.target;
      this.focusedColumnIndex = target.hasAttribute('inlineeditable-column') ?
          parseInt(target.getAttribute('inlineeditable-column'), 10) : -1;
    },
  };

  /**
   * Takes care of committing changes to inline editable list items when the
   * window loses focus.
   */
  function handleWindowBlurs() {
    window.addEventListener('blur', function(e) {
      var itemAncestor = findAncestor(document.activeElement, function(node) {
        return node instanceof InlineEditableItem;
      });
      if (itemAncestor)
        document.activeElement.blur();
    });
  }
  handleWindowBlurs();

  /**
   * @constructor
   * @extends {options.DeletableItemList}
   */
  var InlineEditableItemList = cr.ui.define('list');

  InlineEditableItemList.prototype = {
    __proto__: DeletableItemList.prototype,

    /**
     * Whether to ignore list change events.
     * Used to modify the list without processing selection change and lead
     * change events.
     * @type {boolean}
     * @private
     */
    ignoreChangeEvents_: false,

    /**
     * Focuses the input element of the placeholder if true.
     * @type {boolean}
     * @private
     */
    needsToFocusPlaceholder_: false,

    /** @override */
    decorate: function() {
      DeletableItemList.prototype.decorate.call(this);
      this.setAttribute('inlineeditable', '');
      this.addEventListener('hasElementFocusChange',
                            this.handleListFocusChange_);
      // <list> isn't focusable by default, but cr.ui.List defaults tabindex to
      // 0 if it's not set.
      this.tabIndex = -1;
    },

    /**
     * Called when the list hierarchy as a whole loses or gains focus; starts
     * or ends editing for the lead item if necessary.
     * @param {Event} e The change event.
     * @private
     */
    handleListFocusChange_: function(e) {
      var leadItem = this.getListItemByIndex(this.selectionModel.leadIndex);
      if (leadItem) {
        if (e.newValue) {
          // Add focusability before making other changes.
          leadItem.setEditableValuesFocusable(true);
          leadItem.setCloseButtonFocusable(true);
          leadItem.focusedColumnIndex = -1;
          leadItem.updateEditState();
          // Remove focusability after making other changes.
          leadItem.setStaticValuesFocusable(false);
        } else {
          // Add focusability before making other changes.
          leadItem.setStaticValuesFocusable(true);
          leadItem.setCloseButtonFocusable(true);
          leadItem.editing = false;
          // Remove focusability after making other changes.
          if (!leadItem.isPlaceholder)
            leadItem.setEditableValuesFocusable(false);
        }
      }
    },

    /** @override */
    handleLeadChange: function(e) {
      if (this.ignoreChangeEvents_)
        return;

      DeletableItemList.prototype.handleLeadChange.call(this, e);

      var focusedColumnIndex = -1;
      if (e.oldValue != -1) {
        var element = this.getListItemByIndex(e.oldValue);
        if (element) {
          focusedColumnIndex = element.focusedColumnIndex;
          element.updateLeadState();
        }
      }

      if (e.newValue != -1) {
        var element = this.getListItemByIndex(e.newValue);
        if (element) {
          element.focusedColumnIndex = focusedColumnIndex;
          element.updateLeadState();
        }
      }
    },

    /** @override */
    onSetDataModelComplete: function() {
      DeletableItemList.prototype.onSetDataModelComplete.call(this);

      if (this.needsToFocusPlaceholder_) {
        this.focusPlaceholder();
      } else {
        var item = this.getInitialFocusableItem();
        if (item) {
          item.setStaticValuesFocusable(true);
          item.setCloseButtonFocusable(true);
          if (item.isPlaceholder)
            item.setEditableValuesFocusable(true);
        }
      }
    },

    /**
     * Execute |callback| with list change events disabled. Selection change and
     * lead change events will not be processed.
     * @param {!Function} callback The function to execute.
     * @protected
     */
    ignoreChangeEvents: function(callback) {
      assert(!this.ignoreChangeEvents_);
      this.ignoreChangeEvents_ = true;
      callback();
      this.ignoreChangeEvents_ = false;
    },

    /**
     * Set the selected index without changing the focused element on the page.
     * Used to change the selected index when the list doesn't have focus (and
     * doesn't want to take focus).
     * @param {number} index The index to select.
     */
    selectIndexWithoutFocusing: function(index) {
      // Remove focusability from old item.
      var oldItem = this.getListItemByIndex(this.selectionModel.leadIndex) ||
                    this.getInitialFocusableItem();
      if (oldItem) {
        oldItem.setEditableValuesFocusable(false);
        oldItem.setStaticValuesFocusable(false);
        oldItem.setCloseButtonFocusable(false);
        oldItem.lead = false;
      }

      // Select the new item.
      this.ignoreChangeEvents(function() {
        this.selectionModel.selectedIndex = index;
      }.bind(this));

      // Add focusability to new item.
      var newItem = this.getListItemByIndex(index);
      if (newItem) {
        if (newItem.isPlaceholder)
          newItem.setEditableValuesFocusable(true);
        else
          newItem.setStaticValuesFocusable(true);

        newItem.setCloseButtonFocusable(true);
        newItem.lead = true;
      }
    },

    /**
     * Focus the placeholder's first input field.
     * Should only be called immediately after the list has been repopulated.
     */
    focusPlaceholder: function() {
      // Remove focusability from initial item.
      var item = this.getInitialFocusableItem();
      if (item) {
        item.setStaticValuesFocusable(false);
        item.setCloseButtonFocusable(false);
      }
      // Find placeholder and focus it.
      for (var i = 0; i < this.dataModel.length; i++) {
        var item = this.getListItemByIndex(i);
        if (item.isPlaceholder) {
          item.setEditableValuesFocusable(true);
          item.setCloseButtonFocusable(true);
          item.querySelector('input').focus();
          return;
        }
      }
    },

    /**
     * May be overridden by subclasses to disable focusing the placeholder.
     * @return {boolean} True if the placeholder element should be focused on
     *     edit commit.
     * @protected
     */
    shouldFocusPlaceholderOnEditCommit: function() {
      return true;
    },

    /**
    * Override to change which item is initially focusable.
    * @return {options.InlineEditableItem} Initially focusable item or null.
    * @protected
    */
    getInitialFocusableItem: function() {
      return /** @type {options.InlineEditableItem} */(
          this.getListItemByIndex(0));
    },
  };

  // Export
  return {
    InlineEditableItem: InlineEditableItem,
    InlineEditableItemList: InlineEditableItemList,
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /** @const */ var FocusOutlineManager = cr.ui.FocusOutlineManager;

  var OptionsPage = {
    /**
     * This is the absolute difference maintained between standard and
     * fixed-width font sizes. Refer http://crbug.com/91922.
     * @const
     */
    SIZE_DIFFERENCE_FIXED_STANDARD: 3,

    /**
     * Initializes the complete options page. This will cause all C++ handlers
     * to be invoked to do final setup.
     */
    initialize: function() {
      chrome.send('coreOptionsInitialize');
    },

    /**
     * Shows the tab contents for the given navigation tab.
     * @param {Node} tab The tab that the user clicked.
     */
    showTab: function(tab) {
      // Search parents until we find a tab, or the nav bar itself. This allows
      // tabs to have child nodes, e.g. labels in separately-styled spans.
      while (tab && tab.classList &&
             !tab.classList.contains('subpages-nav-tabs') &&
             !tab.classList.contains('tab')) {
        tab = tab.parentNode;
      }
      if (!tab || !tab.classList || !tab.classList.contains('tab'))
        return;

      // Find tab bar of the tab.
      var tabBar = tab;
      while (tabBar && tabBar.classList &&
             !tabBar.classList.contains('subpages-nav-tabs')) {
        tabBar = tabBar.parentNode;
      }
      if (!tabBar || !tabBar.classList)
        return;

      if (tabBar.activeNavTab != null) {
        tabBar.activeNavTab.classList.remove('active-tab');
        $(tabBar.activeNavTab.getAttribute('tab-contents')).classList.
            remove('active-tab-contents');
      }

      tab.classList.add('active-tab');
      $(tab.getAttribute('tab-contents')).classList.add('active-tab-contents');
      tabBar.activeNavTab = tab;
    },

    /**
     * Shows or hides options for clearing Flash LSOs.
     * @param {boolean} enabled Whether plugin data can be cleared.
     */
    setClearPluginLSODataEnabled: function(enabled) {
      if (enabled) {
        document.documentElement.setAttribute(
            'flashPluginSupportsClearSiteData', '');
      } else {
        document.documentElement.removeAttribute(
            'flashPluginSupportsClearSiteData');
      }
      if (navigator.plugins['Shockwave Flash'])
        document.documentElement.setAttribute('hasFlashPlugin', '');
    },

    /**
     * Shows or hides Pepper Flash settings.
     * @param {boolean} enabled Whether Pepper Flash settings should be enabled.
     */
    setPepperFlashSettingsEnabled: function(enabled) {
      if (enabled) {
        document.documentElement.setAttribute(
            'enablePepperFlashSettings', '');
      } else {
        document.documentElement.removeAttribute(
            'enablePepperFlashSettings');
      }
    },

    /**
     * Sets whether Settings is shown as a standalone page in a window for the
     * app launcher settings "app".
     * @param {boolean} isSettingsApp Whether this page is shown standalone.
     */
    setIsSettingsApp: function(isSettingsApp) {
      document.documentElement.classList.toggle('settings-app', isSettingsApp);
    },

    /**
     * Returns true if Settings is shown as an "app" (in a window by itself)
     * for the app launcher settings "app".
     * @return {boolean} Whether this page is shown standalone.
     */
    isSettingsApp: function() {
      return document.documentElement.classList.contains('settings-app');
    },
  };

  // Export
  return {
    OptionsPage: OptionsPage
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  var Preferences = options.Preferences;

  /**
   * Allows an element to be disabled for several reasons.
   * The element is disabled if at least one reason is true, and the reasons
   * can be set separately.
   * @private
   * @param {!HTMLElement} el The element to update.
   * @param {string} reason The reason for disabling the element.
   * @param {boolean} disabled Whether the element should be disabled or enabled
   * for the given |reason|.
   */
  function updateDisabledState(el, reason, disabled) {
    if (!el.disabledReasons)
      el.disabledReasons = {};

    if (el.disabled && (Object.keys(el.disabledReasons).length == 0)) {
      // The element has been previously disabled without a reason, so we add
      // one to keep it disabled.
      el.disabledReasons.other = true;
    }

    if (!el.disabled) {
      // If the element is not disabled, there should be no reason, except for
      // 'other'.
      delete el.disabledReasons.other;
      if (Object.keys(el.disabledReasons).length > 0)
        console.error('Element is not disabled but should be');
    }

    if (disabled)
      el.disabledReasons[reason] = true;
    else
      delete el.disabledReasons[reason];

    el.disabled = Object.keys(el.disabledReasons).length > 0;
  }

  /////////////////////////////////////////////////////////////////////////////
  // PrefInputElement class:

  /**
   * Define a constructor that uses an input element as its underlying element.
   * @constructor
   * @extends {HTMLInputElement}
   */
  var PrefInputElement = cr.ui.define('input');

  PrefInputElement.prototype = {
    // Set up the prototype chain
    __proto__: HTMLInputElement.prototype,

    /**
     * Initialization function for the cr.ui framework.
     */
    decorate: function() {
      var self = this;

      // Listen for user events.
      this.addEventListener('change', this.handleChange.bind(this));

      // Listen for pref changes.
      Preferences.getInstance().addEventListener(this.pref, function(event) {
        if (event.value.uncommitted && !self.dialogPref)
          return;
        self.updateStateFromPref(event);
        updateDisabledState(self, 'notUserModifiable', event.value.disabled);
        self.controlledBy = event.value.controlledBy;
      });
    },

    /**
     * Handle changes to the input element's state made by the user. If a custom
     * change handler does not suppress it, a default handler is invoked that
     * updates the associated pref.
     * @param {Event} event Change event.
     * @protected
     */
    handleChange: function(event) {
      if (!this.customChangeHandler(event))
        this.updatePrefFromState();
    },

    /**
     * Handles changes to the pref. If a custom change handler does not suppress
     * it, a default handler is invoked that updates the input element's state.
     * @param {Event} event Pref change event.
     * @protected
     */
    updateStateFromPref: function(event) {
      if (!this.customPrefChangeHandler(event))
        this.value = event.value.value;
    },

    /**
     * An abstract method for all subclasses to override to update their
     * preference from existing state.
     * @protected
     */
    updatePrefFromState: assertNotReached,

    /**
     * See |updateDisabledState| above.
     */
    setDisabled: function(reason, disabled) {
      updateDisabledState(this, reason, disabled);
    },

    /**
     * Custom change handler that is invoked first when the user makes changes
     * to the input element's state. If it returns false, a default handler is
     * invoked next that updates the associated pref. If it returns true, the
     * default handler is suppressed (i.e., this works like stopPropagation or
     * cancelBubble).
     * @param {Event} event Input element change event.
     */
    customChangeHandler: function(event) {
      return false;
    },

    /**
     * Custom change handler that is invoked first when the preference
     * associated with the input element changes. If it returns false, a default
     * handler is invoked next that updates the input element. If it returns
     * true, the default handler is suppressed.
     * @param {Event} event Input element change event.
     */
    customPrefChangeHandler: function(event) {
      return false;
    },
  };

  /**
   * The name of the associated preference.
   */
  cr.defineProperty(PrefInputElement, 'pref', cr.PropertyKind.ATTR);

  /**
   * The data type of the associated preference, only relevant for derived
   * classes that support different data types.
   */
  cr.defineProperty(PrefInputElement, 'dataType', cr.PropertyKind.ATTR);

  /**
   * Whether this input element is part of a dialog. If so, changes take effect
   * in the settings UI immediately but are only actually committed when the
   * user confirms the dialog. If the user cancels the dialog instead, the
   * changes are rolled back in the settings UI and never committed.
   */
  cr.defineProperty(PrefInputElement, 'dialogPref', cr.PropertyKind.BOOL_ATTR);

  /**
   * Whether the associated preference is controlled by a source other than the
   * user's setting (can be 'policy', 'extension', 'recommended' or unset).
   */
  cr.defineProperty(PrefInputElement, 'controlledBy', cr.PropertyKind.ATTR);

  /**
   * The user metric string.
   */
  cr.defineProperty(PrefInputElement, 'metric', cr.PropertyKind.ATTR);

  /////////////////////////////////////////////////////////////////////////////
  // PrefCheckbox class:

  /**
   * Define a constructor that uses an input element as its underlying element.
   * @constructor
   * @extends {options.PrefInputElement}
   */
  var PrefCheckbox = cr.ui.define('input');

  PrefCheckbox.prototype = {
    // Set up the prototype chain
    __proto__: PrefInputElement.prototype,

    /**
     * Initialization function for the cr.ui framework.
     */
    decorate: function() {
      PrefInputElement.prototype.decorate.call(this);
      this.type = 'checkbox';

      // Consider a checked dialog checkbox as a 'suggestion' which is committed
      // once the user confirms the dialog.
      if (this.dialogPref && this.checked)
        this.updatePrefFromState();
    },

    /**
     * Update the associated pref when when the user makes changes to the
     * checkbox state.
     * @override
     */
    updatePrefFromState: function() {
      var value = this.inverted_pref ? !this.checked : this.checked;
      Preferences.setBooleanPref(this.pref, value,
                                 !this.dialogPref, this.metric);
    },

    /** @override */
    updateStateFromPref: function(event) {
      if (!this.customPrefChangeHandler(event))
        this.defaultPrefChangeHandler(event);
    },

    /**
     * @param {Event} event A pref change event.
     */
    defaultPrefChangeHandler: function(event) {
      var value = Boolean(event.value.value);
      this.checked = this.inverted_pref ? !value : value;
    },
  };

  /**
   * Whether the mapping between checkbox state and associated pref is inverted.
   */
  cr.defineProperty(PrefCheckbox, 'inverted_pref', cr.PropertyKind.BOOL_ATTR);

  /////////////////////////////////////////////////////////////////////////////
  // PrefNumber class:

  // Define a constructor that uses an input element as its underlying element.
  var PrefNumber = cr.ui.define('input');

  PrefNumber.prototype = {
    // Set up the prototype chain
    __proto__: PrefInputElement.prototype,

    /**
     * Initialization function for the cr.ui framework.
     */
    decorate: function() {
      PrefInputElement.prototype.decorate.call(this);
      this.type = 'number';
    },

    /**
     * Update the associated pref when the user inputs a number.
     * @override
     */
    updatePrefFromState: function() {
      if (this.validity.valid) {
        Preferences.setIntegerPref(this.pref, this.value,
                                   !this.dialogPref, this.metric);
      }
    },
  };

  /////////////////////////////////////////////////////////////////////////////
  // PrefRadio class:

  //Define a constructor that uses an input element as its underlying element.
  var PrefRadio = cr.ui.define('input');

  PrefRadio.prototype = {
    // Set up the prototype chain
    __proto__: PrefInputElement.prototype,

    /**
     * Initialization function for the cr.ui framework.
     */
    decorate: function() {
      PrefInputElement.prototype.decorate.call(this);
      this.type = 'radio';
    },

    /**
     * Update the associated pref when when the user selects the radio button.
     * @override
     */
    updatePrefFromState: function() {
      if (this.value == 'true' || this.value == 'false') {
        Preferences.setBooleanPref(this.pref,
                                   this.value == String(this.checked),
                                   !this.dialogPref, this.metric);
      } else {
        Preferences.setIntegerPref(this.pref, this.value,
                                   !this.dialogPref, this.metric);
      }
    },

    /** @override */
    updateStateFromPref: function(event) {
      if (!this.customPrefChangeHandler(event))
        this.checked = this.value == String(event.value.value);
    },
  };

  /////////////////////////////////////////////////////////////////////////////
  // PrefRange class:

  /**
   * Define a constructor that uses an input element as its underlying element.
   * @constructor
   * @extends {options.PrefInputElement}
   */
  var PrefRange = cr.ui.define('input');

  PrefRange.prototype = {
    // Set up the prototype chain
    __proto__: PrefInputElement.prototype,

    /**
     * The map from slider position to corresponding pref value.
     */
    valueMap: undefined,

    /**
     * Initialization function for the cr.ui framework.
     */
    decorate: function() {
      PrefInputElement.prototype.decorate.call(this);
      this.type = 'range';

      // Listen for user events.
      // TODO(jhawkins): Add onmousewheel handling once the associated WK bug is
      // fixed.
      // https://bugs.webkit.org/show_bug.cgi?id=52256
      this.addEventListener('keyup', this.handleRelease_.bind(this));
      this.addEventListener('mouseup', this.handleRelease_.bind(this));
      this.addEventListener('touchcancel', this.handleRelease_.bind(this));
      this.addEventListener('touchend', this.handleRelease_.bind(this));
    },

    /**
     * Update the associated pref when when the user releases the slider.
     * @override
     */
    updatePrefFromState: function() {
      Preferences.setIntegerPref(
          this.pref,
          this.mapPositionToPref(parseInt(this.value, 10)),
          !this.dialogPref,
          this.metric);
    },

    /** @override */
    handleChange: function() {
      // Ignore changes to the slider position made by the user while the slider
      // has not been released.
    },

    /**
     * Handle changes to the slider position made by the user when the slider is
     * released. If a custom change handler does not suppress it, a default
     * handler is invoked that updates the associated pref.
     * @param {Event} event Change event.
     * @private
     */
    handleRelease_: function(event) {
      if (!this.customChangeHandler(event))
        this.updatePrefFromState();
    },

    /**
     * Handles changes to the pref associated with the slider. If a custom
     * change handler does not suppress it, a default handler is invoked that
     * updates the slider position.
     * @override.
     */
    updateStateFromPref: function(event) {
      if (this.customPrefChangeHandler(event))
        return;
      var value = event.value.value;
      this.value = this.valueMap ? this.valueMap.indexOf(value) : value;
    },

    /**
     * Map slider position to the range of values provided by the client,
     * represented by |valueMap|.
     * @param {number} position The slider position to map.
     */
    mapPositionToPref: function(position) {
      return this.valueMap ? this.valueMap[position] : position;
    },
  };

  /////////////////////////////////////////////////////////////////////////////
  // PrefSelect class:

  // Define a constructor that uses a select element as its underlying element.
  var PrefSelect = cr.ui.define('select');

  PrefSelect.prototype = {
    // Set up the prototype chain
    __proto__: HTMLSelectElement.prototype,

    /** @override */
    decorate: PrefInputElement.prototype.decorate,

    /** @override */
    handleChange: PrefInputElement.prototype.handleChange,

    /**
     * Update the associated pref when when the user selects an item.
     * @override
     */
    updatePrefFromState: function() {
      var value = this.options[this.selectedIndex].value;
      switch (this.dataType) {
        case 'number':
          Preferences.setIntegerPref(this.pref, value,
                                     !this.dialogPref, this.metric);
          break;
        case 'double':
          Preferences.setDoublePref(this.pref, value,
                                    !this.dialogPref, this.metric);
          break;
        case 'boolean':
          Preferences.setBooleanPref(this.pref, value == 'true',
                                     !this.dialogPref, this.metric);
          break;
        case 'string':
          Preferences.setStringPref(this.pref, value,
                                    !this.dialogPref, this.metric);
          break;
        default:
          console.error('Unknown data type for <select> UI element: ' +
                        this.dataType);
      }
    },

    /** @override */
    updateStateFromPref: function(event) {
      if (this.customPrefChangeHandler(event))
        return;

      // Make sure the value is a string, because the value is stored as a
      // string in the HTMLOptionElement.
      var value = String(event.value.value);

      var found = false;
      for (var i = 0; i < this.options.length; i++) {
        if (this.options[i].value == value) {
          this.selectedIndex = i;
          found = true;
        }
      }

      // Item not found, select first item.
      if (!found)
        this.selectedIndex = 0;

      // The "onchange" event automatically fires when the user makes a manual
      // change. It should never be fired for a programmatic change. However,
      // these two lines were here already and it is hard to tell who may be
      // relying on them.
      if (this.onchange)
        this.onchange(event);
    },

    /** @override */
    setDisabled: PrefInputElement.prototype.setDisabled,

    /** @override */
    customChangeHandler: PrefInputElement.prototype.customChangeHandler,

    /** @override */
    customPrefChangeHandler: PrefInputElement.prototype.customPrefChangeHandler,
  };

  /**
   * The name of the associated preference.
   */
  cr.defineProperty(PrefSelect, 'pref', cr.PropertyKind.ATTR);

  /**
   * The data type of the associated preference, only relevant for derived
   * classes that support different data types.
   */
  cr.defineProperty(PrefSelect, 'dataType', cr.PropertyKind.ATTR);

  /**
   * Whether this input element is part of a dialog. If so, changes take effect
   * in the settings UI immediately but are only actually committed when the
   * user confirms the dialog. If the user cancels the dialog instead, the
   * changes are rolled back in the settings UI and never committed.
   */
  cr.defineProperty(PrefSelect, 'dialogPref', cr.PropertyKind.BOOL_ATTR);

  /**
   * Whether the associated preference is controlled by a source other than the
   * user's setting (can be 'policy', 'extension', 'recommended' or unset).
   */
  cr.defineProperty(PrefSelect, 'controlledBy', cr.PropertyKind.ATTR);

  /**
   * The user metric string.
   */
  cr.defineProperty(PrefSelect, 'metric', cr.PropertyKind.ATTR);

  /////////////////////////////////////////////////////////////////////////////
  // PrefTextField class:

  // Define a constructor that uses an input element as its underlying element.
  var PrefTextField = cr.ui.define('input');

  PrefTextField.prototype = {
    // Set up the prototype chain
    __proto__: PrefInputElement.prototype,

    /**
     * Initialization function for the cr.ui framework.
     */
    decorate: function() {
      PrefInputElement.prototype.decorate.call(this);
      var self = this;

      // Listen for user events.
      window.addEventListener('unload', function() {
        if (document.activeElement == self)
          self.blur();
      });
    },

    /**
     * Update the associated pref when when the user inputs text.
     * @override
     */
    updatePrefFromState: function(event) {
      switch (this.dataType) {
        case 'number':
          Preferences.setIntegerPref(this.pref, this.value,
                                     !this.dialogPref, this.metric);
          break;
        case 'double':
          Preferences.setDoublePref(this.pref, this.value,
                                    !this.dialogPref, this.metric);
          break;
        case 'url':
          Preferences.setURLPref(this.pref, this.value,
                                 !this.dialogPref, this.metric);
          break;
        default:
          Preferences.setStringPref(this.pref, this.value,
                                    !this.dialogPref, this.metric);
          break;
      }
    },
  };

  /////////////////////////////////////////////////////////////////////////////
  // PrefPortNumber class:

  // Define a constructor that uses an input element as its underlying element.
  var PrefPortNumber = cr.ui.define('input');

  PrefPortNumber.prototype = {
    // Set up the prototype chain
    __proto__: PrefTextField.prototype,

    /**
     * Initialization function for the cr.ui framework.
     */
    decorate: function() {
      var self = this;
      self.type = 'text';
      self.dataType = 'number';
      PrefTextField.prototype.decorate.call(this);
      self.oninput = function() {
        // Note that using <input type="number"> is insufficient to restrict
        // the input as it allows negative numbers and does not limit the
        // number of charactes typed even if a range is set.  Furthermore,
        // it sometimes produces strange repaint artifacts.
        var filtered = self.value.replace(/[^0-9]/g, '');
        if (filtered != self.value)
          self.value = filtered;
      };
    }
  };

  /////////////////////////////////////////////////////////////////////////////
  // PrefButton class:

  // Define a constructor that uses a button element as its underlying element.
  var PrefButton = cr.ui.define('button');

  PrefButton.prototype = {
    // Set up the prototype chain
    __proto__: HTMLButtonElement.prototype,

    /**
     * Initialization function for the cr.ui framework.
     */
    decorate: function() {
      var self = this;

      // Listen for pref changes.
      // This element behaves like a normal button and does not affect the
      // underlying preference; it just becomes disabled when the preference is
      // managed, and its value is false. This is useful for buttons that should
      // be disabled when the underlying Boolean preference is set to false by a
      // policy or extension.
      Preferences.getInstance().addEventListener(this.pref, function(event) {
        updateDisabledState(self, 'notUserModifiable',
                            event.value.disabled && !event.value.value);
        self.controlledBy = event.value.controlledBy;
      });
    },

    /**
     * See |updateDisabledState| above.
     */
    setDisabled: function(reason, disabled) {
      updateDisabledState(this, reason, disabled);
    },
  };

  /**
   * The name of the associated preference.
   */
  cr.defineProperty(PrefButton, 'pref', cr.PropertyKind.ATTR);

  /**
   * Whether the associated preference is controlled by a source other than the
   * user's setting (can be 'policy', 'extension', 'recommended' or unset).
   */
  cr.defineProperty(PrefButton, 'controlledBy', cr.PropertyKind.ATTR);

  // Export
  return {
    PrefCheckbox: PrefCheckbox,
    PrefInputElement: PrefInputElement,
    PrefNumber: PrefNumber,
    PrefRadio: PrefRadio,
    PrefRange: PrefRange,
    PrefSelect: PrefSelect,
    PrefTextField: PrefTextField,
    PrefPortNumber: PrefPortNumber,
    PrefButton: PrefButton
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview Base class for dialogs that require saving preferences on
 *     confirm and resetting preference inputs on cancel.
 */

cr.define('options', function() {
  /** @const */ var Page = cr.ui.pageManager.Page;
  /** @const */ var PageManager = cr.ui.pageManager.PageManager;

  /**
   * Base class for settings dialogs.
   * @constructor
   * @param {string} name See Page constructor.
   * @param {string} title See Page constructor.
   * @param {string} pageDivName See Page constructor.
   * @param {HTMLButtonElement} okButton The confirmation button element.
   * @param {HTMLButtonElement} cancelButton The cancellation button element.
   * @extends {cr.ui.pageManager.Page}
   */
  function SettingsDialog(name, title, pageDivName, okButton, cancelButton) {
    Page.call(this, name, title, pageDivName);
    this.okButton = okButton;
    this.cancelButton = cancelButton;
  }

  SettingsDialog.prototype = {
    __proto__: Page.prototype,

    /** @override */
    initializePage: function() {
      this.okButton.onclick = this.handleConfirm.bind(this);
      this.cancelButton.onclick = this.handleCancel.bind(this);
    },

    /**
     * Handles the confirm button by saving the dialog preferences.
     */
    handleConfirm: function() {
      PageManager.closeOverlay();

      var prefs = Preferences.getInstance();
      var els = this.pageDiv.querySelectorAll('[dialog-pref]');
      for (var i = 0; i < els.length; i++) {
        if (els[i].pref)
          prefs.commitPref(els[i].pref, els[i].metric);
      }
    },

    /**
     * Handles the cancel button by closing the overlay.
     */
    handleCancel: function() {
      PageManager.closeOverlay();

      var prefs = Preferences.getInstance();
      var els = this.pageDiv.querySelectorAll('[dialog-pref]');
      for (var i = 0; i < els.length; i++) {
        if (els[i].pref)
          prefs.rollbackPref(els[i].pref);
      }
    },
  };

  return {
    SettingsDialog: SettingsDialog
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /** @const */ var ArrayDataModel = cr.ui.ArrayDataModel;
  /** @const */ var Grid = cr.ui.Grid;
  /** @const */ var GridItem = cr.ui.GridItem;
  /** @const */ var GridSelectionController = cr.ui.GridSelectionController;
  /** @const */ var ListSingleSelectionModel = cr.ui.ListSingleSelectionModel;

   /**
    * Dimensions for camera capture.
    * @const
    */
  var CAPTURE_SIZE = {
    height: 480,
    width: 480
  };

  /**
   * Path for internal URLs.
   * @const
   */
  var CHROME_THEME_PATH = 'http://chromesettings.github.io/theme';

  /**
   * Creates a new user images grid item.
   * @param {{url: string, title: (string|undefined),
   *     decorateFn: (!Function|undefined),
   *     clickHandler: (!Function|undefined)}} imageInfo User image URL,
   *     optional title, decorator callback and click handler.
   * @constructor
   * @extends {cr.ui.GridItem}
   */
  function UserImagesGridItem(imageInfo) {
    var el = new GridItem(imageInfo);
    el.__proto__ = UserImagesGridItem.prototype;
    return el;
  }

  UserImagesGridItem.prototype = {
    __proto__: GridItem.prototype,

    /** @override */
    decorate: function() {
      GridItem.prototype.decorate.call(this);
      var imageEl = cr.doc.createElement('img');
      // Force 1x scale for http://chromesettings.github.io/theme URLs. Grid elements are much smaller
      // than actual images so there is no need in full scale on HDPI.
      var url = this.dataItem.url;
      if (url.slice(0, CHROME_THEME_PATH.length) == CHROME_THEME_PATH)
        imageEl.src = this.dataItem.url + '@1x';
      else
        imageEl.src = this.dataItem.url;
      imageEl.title = this.dataItem.title || '';
      imageEl.alt = imageEl.title;
      if (typeof this.dataItem.clickHandler == 'function')
        imageEl.addEventListener('mousedown', this.dataItem.clickHandler);
      // Remove any garbage added by GridItem and ListItem decorators.
      this.textContent = '';
      this.appendChild(imageEl);
      if (typeof this.dataItem.decorateFn == 'function')
        this.dataItem.decorateFn(this);
      this.setAttribute('role', 'option');
      this.oncontextmenu = function(e) { e.preventDefault(); };
    }
  };

  /**
   * Creates a selection controller that wraps selection on grid ends
   * and translates Enter presses into 'activate' events.
   * @param {cr.ui.ListSelectionModel} selectionModel The selection model to
   *     interact with.
   * @param {cr.ui.Grid} grid The grid to interact with.
   * @constructor
   * @extends {cr.ui.GridSelectionController}
   */
  function UserImagesGridSelectionController(selectionModel, grid) {
    GridSelectionController.call(this, selectionModel, grid);
  }

  UserImagesGridSelectionController.prototype = {
    __proto__: GridSelectionController.prototype,

    /** @override */
    getIndexBefore: function(index) {
      var result =
          GridSelectionController.prototype.getIndexBefore.call(this, index);
      return result == -1 ? this.getLastIndex() : result;
    },

    /** @override */
    getIndexAfter: function(index) {
      var result =
          GridSelectionController.prototype.getIndexAfter.call(this, index);
      return result == -1 ? this.getFirstIndex() : result;
    },

    /** @override */
    handleKeyDown: function(e) {
      if (e.keyIdentifier == 'Enter')
        cr.dispatchSimpleEvent(this.grid_, 'activate');
      else
        GridSelectionController.prototype.handleKeyDown.call(this, e);
    }
  };

  /**
   * Creates a new user images grid element.
   * @param {Object=} opt_propertyBag Optional properties.
   * @constructor
   * @extends {cr.ui.Grid}
   */
  var UserImagesGrid = cr.ui.define('grid');

  UserImagesGrid.prototype = {
    __proto__: Grid.prototype,

    /** @override */
    createSelectionController: function(sm) {
      return new UserImagesGridSelectionController(sm, this);
    },

    /** @override */
    decorate: function() {
      Grid.prototype.decorate.call(this);
      this.dataModel = new ArrayDataModel([]);
      this.itemConstructor = /** @type {function(new:cr.ui.ListItem, *)} */(
          UserImagesGridItem);
      this.selectionModel = new ListSingleSelectionModel();
      this.inProgramSelection_ = false;
      this.addEventListener('dblclick', this.handleDblClick_.bind(this));
      this.addEventListener('change', this.handleChange_.bind(this));
      this.setAttribute('role', 'listbox');
      this.autoExpands = true;
    },

    /**
     * Handles double click on the image grid.
     * @param {Event} e Double click Event.
     * @private
     */
    handleDblClick_: function(e) {
      // If a child element is double-clicked and not the grid itself, handle
      // this as 'Enter' keypress.
      if (e.target != this)
        cr.dispatchSimpleEvent(this, 'activate');
    },

    /**
     * Handles selection change.
     * @param {Event} e Double click Event.
     * @private
     */
    handleChange_: function(e) {
      if (this.selectedItem === null)
        return;

      var oldSelectionType = this.selectionType;

      // Update current selection type.
      this.selectionType = this.selectedItem.type;

      // Show grey silhouette with the same border as stock images.
      if (/^chrome:\/\/theme\//.test(this.selectedItemUrl))
        this.previewElement.classList.add('default-image');

      this.updatePreview_();

      var e = new Event('select');
      e.oldSelectionType = oldSelectionType;
      this.dispatchEvent(e);
    },

    /**
     * Updates the preview image, if present.
     * @private
     */
    updatePreview_: function() {
      var url = this.selectedItemUrl;
      if (url && this.previewImage_) {
        if (url.slice(0, CHROME_THEME_PATH.length) == CHROME_THEME_PATH)
          this.previewImage_.src = url + '@' + window.devicePixelRatio + 'x';
        else
          this.previewImage_.src = url;
      }
    },

    /**
     * Whether a camera is present or not.
     * @type {boolean}
     */
    get cameraPresent() {
      return this.cameraPresent_;
    },
    set cameraPresent(value) {
      this.cameraPresent_ = value;
      if (this.cameraLive)
        this.cameraImage = null;
    },

    /**
     * Whether camera is actually streaming video. May be |false| even when
     * camera is present and shown but still initializing.
     * @type {boolean}
     */
    get cameraOnline() {
      return this.previewElement.classList.contains('online');
    },
    set cameraOnline(value) {
      this.previewElement.classList.toggle('online', value);
    },

    /**
     * Tries to starts camera stream capture.
     * @param {function(): boolean} onAvailable Callback that is called if
     *     camera is available. If it returns |true|, capture is started
     *     immediately.
     */
    startCamera: function(onAvailable, onAbsent) {
      this.stopCamera();
      this.cameraStartInProgress_ = true;
      navigator.webkitGetUserMedia(
          {video: true},
          this.handleCameraAvailable_.bind(this, onAvailable),
          this.handleCameraAbsent_.bind(this));
    },

    /**
     * Stops camera capture, if it's currently active.
     */
    stopCamera: function() {
      this.cameraOnline = false;
      if (this.cameraVideo_)
        this.cameraVideo_.src = '';
      if (this.cameraStream_)
        this.stopVideoTracks_(this.cameraStream_);
      // Cancel any pending getUserMedia() checks.
      this.cameraStartInProgress_ = false;
    },

    /**
     * Stops all video tracks associated with a MediaStream object.
     * @param {MediaStream} stream
     */
    stopVideoTracks_: function(stream) {
      var tracks = stream.getVideoTracks();
      for (var t of tracks)
        t.stop();
    },

    /**
     * Handles successful camera check.
     * @param {function(): boolean} onAvailable Callback to call. If it returns
     *     |true|, capture is started immediately.
     * @param {!MediaStream} stream Stream object as returned by getUserMedia.
     * @private
     * @suppress {deprecated}
     */
    handleCameraAvailable_: function(onAvailable, stream) {
      if (this.cameraStartInProgress_ && onAvailable()) {
        this.cameraVideo_.src = URL.createObjectURL(stream);
        this.cameraStream_ = stream;
      } else {
        this.stopVideoTracks_(stream);
      }
      this.cameraStartInProgress_ = false;
    },

    /**
     * Handles camera check failure.
     * @param {NavigatorUserMediaError=} err Error object.
     * @private
     */
    handleCameraAbsent_: function(err) {
      this.cameraPresent = false;
      this.cameraOnline = false;
      this.cameraStartInProgress_ = false;
    },

    /**
     * Handles successful camera capture start.
     * @private
     */
    handleVideoStarted_: function() {
      this.cameraOnline = true;
      this.handleVideoUpdate_();
    },

    /**
     * Handles camera stream update. Called regularly (at rate no greater then
     * 4/sec) while camera stream is live.
     * @private
     */
    handleVideoUpdate_: function() {
      this.lastFrameTime_ = new Date().getTime();
    },

    /**
     * Type of the selected image (one of 'default', 'profile', 'camera').
     * Setting it will update class list of |previewElement|.
     * @type {string}
     */
    get selectionType() {
      return this.selectionType_;
    },
    set selectionType(value) {
      this.selectionType_ = value;
      var previewClassList = this.previewElement.classList;
      previewClassList[value == 'default' ? 'add' : 'remove']('default-image');
      previewClassList[value == 'profile' ? 'add' : 'remove']('profile-image');
      previewClassList[value == 'camera' ? 'add' : 'remove']('camera');

      var setFocusIfLost = function() {
        // Set focus to the grid, if focus is not on UI.
        if (!document.activeElement ||
            document.activeElement.tagName == 'BODY') {
          $('user-image-grid').focus();
        }
      };
      // Timeout guarantees processing AFTER style changes display attribute.
      setTimeout(setFocusIfLost, 0);
    },

    /**
     * Current image captured from camera as data URL. Setting to null will
     * return to the live camera stream.
     * @type {(string|undefined)}
     */
    get cameraImage() {
      return this.cameraImage_;
    },
    set cameraImage(imageUrl) {
      this.cameraLive = !imageUrl;
      if (this.cameraPresent && !imageUrl)
        imageUrl = UserImagesGrid.ButtonImages.TAKE_PHOTO;
      if (imageUrl) {
        this.cameraImage_ = this.cameraImage_ ?
            this.updateItem(this.cameraImage_, imageUrl, this.cameraTitle_) :
            this.addItem(imageUrl, this.cameraTitle_, undefined, 0);
        this.cameraImage_.type = 'camera';
      } else {
        this.removeItem(this.cameraImage_);
        this.cameraImage_ = null;
      }
    },

    /**
     * Updates the titles for the camera element.
     * @param {string} placeholderTitle Title when showing a placeholder.
     * @param {string} capturedImageTitle Title when showing a captured photo.
     */
    setCameraTitles: function(placeholderTitle, capturedImageTitle) {
      this.placeholderTitle_ = placeholderTitle;
      this.capturedImageTitle_ = capturedImageTitle;
      this.cameraTitle_ = this.placeholderTitle_;
    },

    /**
     * True when camera is in live mode (i.e. no still photo selected).
     * @type {boolean}
     */
    get cameraLive() {
      return this.cameraLive_;
    },
    set cameraLive(value) {
      this.cameraLive_ = value;
      this.previewElement.classList[value ? 'add' : 'remove']('live');
    },

    /**
     * Should only be queried from the 'change' event listener, true if the
     * change event was triggered by a programmatical selection change.
     * @type {boolean}
     */
    get inProgramSelection() {
      return this.inProgramSelection_;
    },

    /**
     * URL of the image selected.
     * @type {string?}
     */
    get selectedItemUrl() {
      var selectedItem = this.selectedItem;
      return selectedItem ? selectedItem.url : null;
    },
    set selectedItemUrl(url) {
      for (var i = 0, el; el = this.dataModel.item(i); i++) {
        if (el.url === url)
          this.selectedItemIndex = i;
      }
    },

    /**
     * Set index to the image selected.
     * @type {number} index The index of selected image.
     */
    set selectedItemIndex(index) {
      this.inProgramSelection_ = true;
      this.selectionModel.selectedIndex = index;
      this.inProgramSelection_ = false;
    },

    /** @override */
    get selectedItem() {
      var index = this.selectionModel.selectedIndex;
      return index != -1 ? this.dataModel.item(index) : null;
    },
    set selectedItem(selectedItem) {
      var index = this.indexOf(selectedItem);
      this.inProgramSelection_ = true;
      this.selectionModel.selectedIndex = index;
      this.selectionModel.leadIndex = index;
      this.inProgramSelection_ = false;
    },

    /**
     * Element containing the preview image (the first IMG element) and the
     * camera live stream (the first VIDEO element).
     * @type {HTMLElement}
     */
    get previewElement() {
      // TODO(ivankr): temporary hack for non-HTML5 version.
      return this.previewElement_ || this;
    },
    set previewElement(value) {
      this.previewElement_ = value;
      this.previewImage_ = value.querySelector('img');
      this.cameraVideo_ = value.querySelector('video');
      this.cameraVideo_.addEventListener('canplay',
                                         this.handleVideoStarted_.bind(this));
      this.cameraVideo_.addEventListener('timeupdate',
                                         this.handleVideoUpdate_.bind(this));
      this.updatePreview_();
      // Initialize camera state and check for its presence.
      this.cameraLive = true;
      this.cameraPresent = false;
    },

    /**
     * Whether the camera live stream and photo should be flipped horizontally.
     * If setting this property results in photo update, 'photoupdated' event
     * will be fired with 'dataURL' property containing the photo encoded as
     * a data URL
     * @type {boolean}
     */
    get flipPhoto() {
      return this.flipPhoto_ || false;
    },
    set flipPhoto(value) {
      if (this.flipPhoto_ == value)
        return;
      this.flipPhoto_ = value;
      this.previewElement.classList.toggle('flip-x', value);
      /* TODO(merkulova): remove when webkit crbug.com/126479 is fixed. */
      this.flipPhotoElement.classList.toggle('flip-trick', value);
      if (!this.cameraLive) {
        // Flip current still photo.
        var e = new Event('photoupdated');
        e.dataURL = this.flipPhoto ?
            this.flipFrame_(this.previewImage_) : this.previewImage_.src;
        this.dispatchEvent(e);
      }
    },

    /**
     * Performs photo capture from the live camera stream. 'phototaken' event
     * will be fired as soon as captured photo is available, with 'dataURL'
     * property containing the photo encoded as a data URL.
     * @return {boolean} Whether photo capture was successful.
     */
    takePhoto: function() {
      if (!this.cameraOnline)
        return false;
      var canvas = /** @type {HTMLCanvasElement} */(
          document.createElement('canvas'));
      canvas.width = CAPTURE_SIZE.width;
      canvas.height = CAPTURE_SIZE.height;
      this.captureFrame_(
          this.cameraVideo_,
          /** @type {CanvasRenderingContext2D} */(canvas.getContext('2d')),
          CAPTURE_SIZE);
      // Preload image before displaying it.
      var previewImg = new Image();
      previewImg.addEventListener('load', function(e) {
        this.cameraTitle_ = this.capturedImageTitle_;
        this.cameraImage = previewImg.src;
      }.bind(this));
      previewImg.src = canvas.toDataURL('image/png');
      var e = new Event('phototaken');
      e.dataURL = this.flipPhoto ? this.flipFrame_(canvas) : previewImg.src;
      this.dispatchEvent(e);
      return true;
    },

    /**
     * Discard current photo and return to the live camera stream.
     */
    discardPhoto: function() {
      this.cameraTitle_ = this.placeholderTitle_;
      this.cameraImage = null;
    },

    /**
     * Capture a single still frame from a <video> element, placing it at the
     * current drawing origin of a canvas context.
     * @param {HTMLVideoElement} video Video element to capture from.
     * @param {CanvasRenderingContext2D} ctx Canvas context to draw onto.
     * @param {{width: number, height: number}} destSize Capture size.
     * @private
     */
    captureFrame_: function(video, ctx, destSize) {
      var width = video.videoWidth;
      var height = video.videoHeight;
      if (width < destSize.width || height < destSize.height) {
        console.error('Video capture size too small: ' +
                      width + 'x' + height + '!');
      }
      var src = {};
      if (width / destSize.width > height / destSize.height) {
        // Full height, crop left/right.
        src.height = height;
        src.width = height * destSize.width / destSize.height;
      } else {
        // Full width, crop top/bottom.
        src.width = width;
        src.height = width * destSize.height / destSize.width;
      }
      src.x = (width - src.width) / 2;
      src.y = (height - src.height) / 2;
      ctx.drawImage(video, src.x, src.y, src.width, src.height,
                    0, 0, destSize.width, destSize.height);
    },

    /**
     * Flips frame horizontally.
     * @param {HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} source
     *     Frame to flip.
     * @return {string} Flipped frame as data URL.
     */
    flipFrame_: function(source) {
      var canvas = document.createElement('canvas');
      canvas.width = CAPTURE_SIZE.width;
      canvas.height = CAPTURE_SIZE.height;
      var ctx = canvas.getContext('2d');
      ctx.translate(CAPTURE_SIZE.width, 0);
      ctx.scale(-1.0, 1.0);
      ctx.drawImage(source, 0, 0);
      return canvas.toDataURL('image/png');
    },

    /**
     * Adds new image to the user image grid.
     * @param {string} url Image URL.
     * @param {string=} opt_title Image tooltip.
     * @param {Function=} opt_clickHandler Image click handler.
     * @param {number=} opt_position If given, inserts new image into
     *     that position (0-based) in image list.
     * @param {Function=} opt_decorateFn Function called with the list element
     *     as argument to do any final decoration.
     * @return {!Object} Image data inserted into the data model.
     */
    // TODO(ivankr): this function needs some argument list refactoring.
    addItem: function(url, opt_title, opt_clickHandler, opt_position,
                      opt_decorateFn) {
      var imageInfo = {
        url: url,
        title: opt_title,
        clickHandler: opt_clickHandler,
        decorateFn: opt_decorateFn
      };
      this.inProgramSelection_ = true;
      if (opt_position !== undefined)
        this.dataModel.splice(opt_position, 0, imageInfo);
      else
        this.dataModel.push(imageInfo);
      this.inProgramSelection_ = false;
      return imageInfo;
    },

    /**
     * Returns index of an image in grid.
     * @param {Object} imageInfo Image data returned from addItem() call.
     * @return {number} Image index (0-based) or -1 if image was not found.
     */
    indexOf: function(imageInfo) {
      return this.dataModel.indexOf(imageInfo);
    },

    /**
     * Replaces an image in the grid.
     * @param {Object} imageInfo Image data returned from addItem() call.
     * @param {string} imageUrl New image URL.
     * @param {string=} opt_title New image tooltip (if undefined, tooltip
     *     is left unchanged).
     * @return {!Object} Image data of the added or updated image.
     */
    updateItem: function(imageInfo, imageUrl, opt_title) {
      var imageIndex = this.indexOf(imageInfo);
      var wasSelected = this.selectionModel.selectedIndex == imageIndex;
      this.removeItem(imageInfo);
      var newInfo = this.addItem(
          imageUrl,
          opt_title === undefined ? imageInfo.title : opt_title,
          imageInfo.clickHandler,
          imageIndex,
          imageInfo.decorateFn);
      // Update image data with the reset of the keys from the old data.
      for (var k in imageInfo) {
        if (!(k in newInfo))
          newInfo[k] = imageInfo[k];
      }
      if (wasSelected)
        this.selectedItem = newInfo;
      return newInfo;
    },

    /**
     * Removes previously added image from the grid.
     * @param {Object} imageInfo Image data returned from the addItem() call.
     */
    removeItem: function(imageInfo) {
      var index = this.indexOf(imageInfo);
      if (index != -1) {
        var wasSelected = this.selectionModel.selectedIndex == index;
        this.inProgramSelection_ = true;
        this.dataModel.splice(index, 1);
        if (wasSelected) {
          // If item removed was selected, select the item next to it.
          this.selectedItem = this.dataModel.item(
              Math.min(this.dataModel.length - 1, index));
        }
        this.inProgramSelection_ = false;
      }
    },

    /**
     * Forces re-display, size re-calculation and focuses grid.
     */
    updateAndFocus: function() {
      // Recalculate the measured item size.
      this.measured_ = null;
      this.columns = 0;
      this.redraw();
      this.focus();
    },

    /**
     * Appends default images to the image grid. Should only be called once.
     * @param {Array<{url: string, author: string,
     *                website: string, title: string}>} imagesData
     *   An array of default images data, including URL, author, title and
     *   website.
     */
    setDefaultImages: function(imagesData) {
      for (var i = 0, data; data = imagesData[i]; i++) {
        var item = this.addItem(data.url, data.title);
        item.type = 'default';
        item.author = data.author || '';
        item.website = data.website || '';
      }
    }
  };

  /**
   * URLs of special button images.
   * @enum {string}
   */
  UserImagesGrid.ButtonImages = {
    TAKE_PHOTO: 'http://chromesettings.github.io/theme/IDR_BUTTON_USER_IMAGE_TAKE_PHOTO',
    CHOOSE_FILE: 'http://chromesettings.github.io/theme/IDR_BUTTON_USER_IMAGE_CHOOSE_FILE',
    PROFILE_PICTURE: 'http://chromesettings.github.io/theme/IDR_PROFILE_PICTURE_LOADING'
  };

  return {
    UserImagesGrid: UserImagesGrid
  };
});

// Copyright 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('help', function() {
  var Page = cr.ui.pageManager.Page;
  var PageManager = cr.ui.pageManager.PageManager;

  /**
   * Encapsulated handling of the channel change overlay.
   */
  function ChannelChangePage() {
    Page.call(this, 'channel-change-page', '', 'channel-change-page');
  }

  cr.addSingletonGetter(ChannelChangePage);

  ChannelChangePage.prototype = {
    __proto__: Page.prototype,

    /**
     * Name of the channel the device is currently on.
     * @private
     */
    currentChannel_: null,

    /**
     * Name of the channel the device is supposed to be on.
     * @private
     */
    targetChannel_: null,

    /**
     * True iff the device is enterprise-managed.
     * @private
     */
    isEnterpriseManaged_: undefined,

    /**
     * List of the channels names, from the least stable to the most stable.
     * @private
     */
    channelList_: ['dev-channel', 'beta-channel', 'stable-channel'],

    /**
     * List of the possible ui states.
     * @private
     */
    uiClassTable_: ['selected-channel-requires-powerwash',
                    'selected-channel-requires-delayed-update',
                    'selected-channel-good',
                    'selected-channel-unstable'],

    /** override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      $('channel-change-page-cancel-button').onclick =
        PageManager.closeOverlay.bind(PageManager);

      var self = this;
      var options = this.getAllChannelOptions_();
      for (var i = 0; i < options.length; i++) {
        var option = options[i];
        option.onclick = function() {
          self.updateUI_(this.value);
        };
      }

      $('channel-change-page-powerwash-button').onclick = function() {
        self.setChannel_(self.getSelectedOption_(), true);
        PageManager.closeOverlay();
      };

      $('channel-change-page-change-button').onclick = function() {
        self.setChannel_(self.getSelectedOption_(), false);
        PageManager.closeOverlay();
      };
    },

    /** @override */
    didShowPage: function() {
      if (this.targetChannel_ != null)
        this.selectOption_(this.targetChannel_);
      else if (this.currentChannel_ != null)
        this.selectOption_(this.currentChannel_);
      var options = this.getAllChannelOptions_();
      for (var i = 0; i < options.length; i++) {
        var option = options[i];
        if (option.checked)
          option.focus();
      }
    },

    /**
     * Returns the list of all radio buttons responsible for channel selection.
     * @return {NodeList} Array of radio buttons
     * @private
     */
    getAllChannelOptions_: function() {
      return this.pageDiv.querySelectorAll('input[type="radio"]');
    },

    /**
     * Returns value of the selected option.
     * @return {?string} Selected channel name or null, if neither
     *     option is selected.
     * @private
     */
    getSelectedOption_: function() {
      var options = this.getAllChannelOptions_();
      for (var i = 0; i < options.length; i++) {
        var option = options[i];
        if (option.checked)
          return option.value;
      }
      return null;
    },

    /**
     * Selects option for a given channel.
     * @param {string} channel Name of channel option that should be selected.
     * @private
     */
    selectOption_: function(channel) {
      var options = this.getAllChannelOptions_();
      for (var i = 0; i < options.length; i++) {
        var option = options[i];
        if (option.value == channel) {
          option.checked = true;
        }
      }
      this.updateUI_(channel);
    },

    /**
     * Updates UI according to selected channel.
     * @param {string} selectedChannel Selected channel
     * @private
     */
    updateUI_: function(selectedChannel) {
      var currentStability = this.channelList_.indexOf(this.currentChannel_);
      var newStability = this.channelList_.indexOf(selectedChannel);

      var newOverlayClass = null;

      if (selectedChannel == this.currentChannel_) {
        if (this.currentChannel_ != this.targetChannel_) {
          // Allow user to switch back to the current channel.
          newOverlayClass = 'selected-channel-good';
        }
      } else if (selectedChannel != this.targetChannel_) {
        // Selected channel isn't equal to the current and target channel.
        if (newStability > currentStability) {
          // More stable channel is selected. For customer devices
          // notify user about powerwash.
          if (this.isEnterpriseManaged_)
            newOverlayClass = 'selected-channel-requires-delayed-update';
          else
            newOverlayClass = 'selected-channel-requires-powerwash';
        } else if (selectedChannel == 'dev-channel') {
          // Warn user about unstable channel.
          newOverlayClass = 'selected-channel-unstable';
        } else {
          // Switching to the less stable channel.
          newOverlayClass = 'selected-channel-good';
        }
      }

      // Switch to the new UI state.
      for (var i = 0; i < this.uiClassTable_.length; i++)
        this.pageDiv.classList.remove(this.uiClassTable_[i]);

      if (newOverlayClass)
        this.pageDiv.classList.add(newOverlayClass);
    },

    /**
     * Sets the device target channel.
     * @param {string} channel The name of the target channel
     * @param {boolean} isPowerwashAllowed True iff powerwash is allowed
     * @private
     */
    setChannel_: function(channel, isPowerwashAllowed) {
      this.targetChannel_ = channel;
      this.updateUI_(channel);
      help.HelpPage.setChannel(channel, isPowerwashAllowed);
    },

    /**
     * Updates page UI according to device owhership policy.
     * @param {boolean} isEnterpriseManaged True if the device is
     *     enterprise managed
     * @private
     */
    updateIsEnterpriseManaged_: function(isEnterpriseManaged) {
      this.isEnterpriseManaged_ = isEnterpriseManaged;
    },

    /**
     * Updates name of the current channel, i.e. the name of the
     * channel the device is currently on.
     * @param {string} channel The name of the current channel
     * @private
     */
    updateCurrentChannel_: function(channel) {
     if (this.channelList_.indexOf(channel) < 0)
        return;
      this.currentChannel_ = channel;
      this.selectOption_(channel);
    },

    /**
     * Updates name of the target channel, i.e. the name of the
     * channel the device is supposed to be in case of a pending
     * channel change.
     * @param {string} channel The name of the target channel
     * @private
     */
    updateTargetChannel_: function(channel) {
      if (this.channelList_.indexOf(channel) < 0)
        return;
      this.targetChannel_ = channel;
    },

    /**
     * @return {boolean} True if the page is ready and can be
     *     displayed, false otherwise
     * @private
     */
    isPageReady_: function() {
      if (typeof this.isEnterpriseManaged_ == 'undefined')
        return false;
      if (!this.currentChannel_ || !this.targetChannel_)
        return false;
      return true;
    },
  };

  ChannelChangePage.updateIsEnterpriseManaged = function(isEnterpriseManaged) {
    ChannelChangePage.getInstance().updateIsEnterpriseManaged_(
        isEnterpriseManaged);
  };

  ChannelChangePage.updateCurrentChannel = function(channel) {
    ChannelChangePage.getInstance().updateCurrentChannel_(channel);
  };

  ChannelChangePage.updateTargetChannel = function(channel) {
    ChannelChangePage.getInstance().updateTargetChannel_(channel);
  };

  ChannelChangePage.isPageReady = function() {
    return ChannelChangePage.getInstance().isPageReady_();
  };

  // Export
  return {
    ChannelChangePage: ChannelChangePage
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview This file contains methods that allow to tweak
 * internal page UI based on the status of current user (owner/user/guest).
 * It is assumed that required data is passed via i18n strings
 * (using loadTimeData dictionary) that are filled with call to
 * AddAccountUITweaksLocalizedValues in ui_account_tweaks.cc.
 * It is also assumed that tweaked page has http://chromesettings.github.io/resources/css/widgets.css
 * included.
 */

cr.define('uiAccountTweaks', function() {

  /////////////////////////////////////////////////////////////////////////////
  // UIAccountTweaks class:

  // String specificators for different types of sessions.
  /** @const */ var SESSION_TYPE_GUEST = 'guest';
  /** @const */ var SESSION_TYPE_PUBLIC = 'public-account';

  /**
   * Encapsulated handling of ChromeOS accounts options page.
   * @constructor
   */
  function UIAccountTweaks() {
  }

  /**
   * @return {boolean} Whether the current user is owner or not.
   */
  UIAccountTweaks.currentUserIsOwner = function() {
    return loadTimeData.getBoolean('currentUserIsOwner');
  };

  /**
   * @return {boolean} Whether we're currently in guest session.
   */
  UIAccountTweaks.loggedInAsGuest = function() {
    return loadTimeData.getBoolean('loggedInAsGuest');
  };

  /**
   * @return {boolean} Whether we're currently in public session.
   */
  UIAccountTweaks.loggedInAsPublicAccount = function() {
    return loadTimeData.getBoolean('loggedInAsPublicAccount');
  };

  /**
   * @return {boolean} Whether we're currently in supervised user mode.
   */
  UIAccountTweaks.loggedInAsSupervisedUser = function() {
    return loadTimeData.getBoolean('loggedInAsSupervisedUser');
  };

  /**
   * Enables an element unless it should be disabled for the session type.
   *
   * @param {!Element} element Element that should be enabled.
   */
  UIAccountTweaks.enableElementIfPossible = function(element) {
    var sessionType;
    if (UIAccountTweaks.loggedInAsGuest())
      sessionType = SESSION_TYPE_GUEST;
    else if (UIAccountTweaks.loggedInAsPublicAccount())
      sessionType = SESSION_TYPE_PUBLIC;

    if (sessionType &&
        element.getAttribute(sessionType + '-visibility') == 'disabled') {
      return;
    }

    element.disabled = false;
  }

  /**
   * Disables or hides some elements in specified type of session in ChromeOS.
   * All elements within given document with *sessionType*-visibility
   * attribute are either hidden (for *sessionType*-visibility="hidden")
   * or disabled (for *sessionType*-visibility="disabled").
   *
   * @param {Document} document Document that should processed.
   * @param {string} sessionType name of the session type processed.
   * @private
   */
  UIAccountTweaks.applySessionTypeVisibility_ = function(document,
                                                         sessionType) {
    var elements = document.querySelectorAll('['+ sessionType + '-visibility]');
    for (var i = 0; i < elements.length; i++) {
      var element = elements[i];
      var visibility = element.getAttribute(sessionType + '-visibility');
      if (visibility == 'hidden')
        element.hidden = true;
      else if (visibility == 'disabled')
        UIAccountTweaks.disableElementsForSessionType(element, sessionType);
    }
  }

  /**
   * Updates specific visibility of elements for Guest session in ChromeOS.
   * Calls applySessionTypeVisibility_ method.
   *
   * @param {Document} document Document that should processed.
   */
  UIAccountTweaks.applyGuestSessionVisibility = function(document) {
    if (!UIAccountTweaks.loggedInAsGuest())
      return;
    UIAccountTweaks.applySessionTypeVisibility_(document, SESSION_TYPE_GUEST);
  }

  /**
   * Updates specific visibility of elements for Public account session in
   * ChromeOS. Calls applySessionTypeVisibility_ method.
   *
   * @param {Document} document Document that should processed.
   */
  UIAccountTweaks.applyPublicSessionVisibility = function(document) {
    if (!UIAccountTweaks.loggedInAsPublicAccount())
      return;
    UIAccountTweaks.applySessionTypeVisibility_(document, SESSION_TYPE_PUBLIC);
  }

  /**
   * Disables and marks page elements for specified session type.
   * Adds #-disabled css class to all elements within given subtree,
   * disables interactive elements (input/select/button), and removes href
   * attribute from <a> elements.
   *
   * @param {!Element} element Root element of DOM subtree that should be
   *     disabled.
   * @param {string} sessionType session type specificator.
   */
  UIAccountTweaks.disableElementsForSessionType = function(element,
                                                           sessionType) {
    UIAccountTweaks.disableElementForSessionType_(element, sessionType);

    // Walk the tree, searching each ELEMENT node.
    var walker = document.createTreeWalker(element,
                                           NodeFilter.SHOW_ELEMENT,
                                           null,
                                           false);

    var node = walker.nextNode();
    while (node) {
      UIAccountTweaks.disableElementForSessionType_(
          /** @type {!Element} */(node), sessionType);
      node = walker.nextNode();
    }
  };

  /**
   * Disables single element for given session type.
   * Adds *sessionType*-disabled css class, adds disabled attribute for
   * appropriate elements (input/select/button), and removes href attribute from
   * <a> element.
   *
   * @private
   * @param {!Element} element Element that should be disabled.
   * @param {string} sessionType account session Type specificator.
   */
  UIAccountTweaks.disableElementForSessionType_ = function(element,
                                                           sessionType) {
    element.classList.add(sessionType + '-disabled');
    if (element.nodeName == 'INPUT' ||
        element.nodeName == 'SELECT' ||
        element.nodeName == 'BUTTON') {
      element.disabled = true;
    } else if (element.nodeName == 'A') {
      element.onclick = function() {
        return false;
      };
    }
  };

  // Export
  return {
    UIAccountTweaks: UIAccountTweaks
  };

});

// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview ONC Data support class. Wraps a dictionary object containing
 * ONC managed or unmanaged dictionaries. Supports nested dictionaries,
 * e.g. data.getManagedProperty('VPN.Type').
 */

cr.exportPath('cr.onc');

cr.define('cr.onc', function() {
  'use strict';

  /**
   * @constructor
   */
  function OncData(data) {
    this.data_ = data;
  }

  OncData.prototype = {
    /** @return {string} The GUID of the network. */
    guid: function() { return this.data_['GUID']; },

    /**
     * Returns either a managed property dictionary or an unmanaged value.
     * @param {string} key The property key.
     * @return {?} The property value or dictionary if it exists, otherwise
     *     undefined.
     */
    getManagedProperty: function(key) {
      var data = this.data_;
      while (true) {
        var index = key.indexOf('.');
        if (index < 0)
          break;
        var keyComponent = key.substr(0, index);
        if (!(keyComponent in data))
          return undefined;
        data = data[keyComponent];
        key = key.substr(index + 1);
      }
      return data[key];
    },

    /**
     * Sets the value of a property. Currently only supports unmanaged
     * properties.
     * @param {string} key The property key.
     * @param {?} value The property value to set.
     */
    setProperty: function(key, value) {
      var data = this.data_;
      while (true) {
        var index = key.indexOf('.');
        if (index < 0)
          break;
        var keyComponent = key.substr(0, index);
        if (!(keyComponent in data))
          data[keyComponent] = {};
        data = data[keyComponent];
        key = key.substr(index + 1);
      }
      if (!(key in data) ||
          (typeof data[key] != 'object') ||
          (!('Active' in data[key]) && !('Effective' in data[key]))) {
        data[key] = value;
      } else {
        var effective = data[key]['Effective'];
        assert(effective != 'UserPolicy' || data[key]['UserEditable']);
        assert(effective != 'DevicePolicy' || data[key]['DeviceEditable']);
        // For now, just update the active value. TODO(stevenjb): Eventually we
        // should update the 'UserSetting' and 'Effective' properties correctly
        // and send that back to Chrome.
        data[key]['Active'] = value;
      }
    },

    /**
     * Gets the active value of a property.
     * @param {string} key The property key.
     * @return {?} The property value or undefined.
     */
    getActiveValue: function(key) {
      var property = this.getManagedProperty(key);
      if (Array.isArray(property) || typeof property != 'object')
        return property;
      // Otherwise get the Active value (default behavior).
      if ('Active' in property)
        return property['Active'];
      // If no Active value is defined, return the effective value if present.
      var effective = this.getEffectiveValueFromProperty_(
          /** @type {Object} */(property));
      if (effective != undefined)
        return effective;
      // Otherwise this is an Object but not a Managed one.
      return property;
    },

    /**
     * Gets the translated ONC value from the result of getActiveValue() using
     * loadTimeData. If no translation exists, returns the untranslated value.
     * @param {string} key The property key.
     * @return {?} The translation if available or the value if not.
     */
    getTranslatedValue: function(key) {
      var value = this.getActiveValue(key);
      if (typeof value != 'string')
        return value;
      var oncString = 'Onc' + key + value;
      // Handle special cases
      if (key == 'Name' && this.getActiveValue('Type') == 'Ethernet')
        return loadTimeData.getString('ethernetName');
      if (key == 'VPN.Type' && value == 'L2TP-IPsec') {
        var auth = this.getActiveValue('VPN.IPsec.AuthenticationType');
        if (auth != undefined)
          oncString += auth;
      }
      oncString = oncString.replace(/\./g, '-');
      if (loadTimeData.valueExists(oncString))
        return loadTimeData.getString(oncString);
      return value;
    },

    /**
     * Gets the recommended value of a property.
     * @param {string} key The property key.
     * @return {?} The property value or undefined.
     */
    getRecommendedValue: function(key) {
      var property = this.getManagedProperty(key);
      if (Array.isArray(property) || typeof property != 'object')
        return undefined;
      if (property['UserEditable'])
        return property['UserPolicy'];
      if (property['DeviceEditable'])
        return property['DevicePolicy'];
      // No value recommended by policy.
      return undefined;
    },

    /**
     * Returns the Source of this configuration. If undefined returns 'None'.
     * @return {string} The configuration source: 'None', 'User', 'Device',
     *                  'UserPolicy', or 'DevicePolicy'.
     */
    getSource: function() {
      var source = this.getActiveValue('Source');
      if (source == undefined)
        return 'None';
      assert(typeof source == 'string');
      return source;
    },

    /**
     * Returns the WiFi security type (defaults to 'None').
     * @return {string} The security type.
     */
    getWiFiSecurity: function() {
      var security = this.getActiveValue('WiFi.Security');
      if (security == undefined)
        return 'None';
      assert(typeof security == 'string');
      return security;
    },

    /**
     * Get the effective value from a Managed property ONC dictionary.
     * @param {Object} property The managed property ONC dictionary.
     * @return {?} The effective value or undefined.
     * @private
     */
    getEffectiveValueFromProperty_: function(property) {
      if ('Effective' in property) {
        var effective = property.Effective;
        if (effective in property)
          return property[effective];
      }
      return undefined;
    },

    /**
     * Returns the complete ONC dictionary.
     */
    getData: function() {
      return this.data_;
    }
  };

  return {
    OncData: OncData
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  var Page = cr.ui.pageManager.Page;
  var PageManager = cr.ui.pageManager.PageManager;
  var UserImagesGrid = options.UserImagesGrid;
  var ButtonImages = UserImagesGrid.ButtonImages;

  /**
   * Array of button URLs used on this page.
   * @type {Array<string>}
   * @const
   */
  var ButtonImageUrls = [
    ButtonImages.TAKE_PHOTO,
    ButtonImages.CHOOSE_FILE
  ];

  /////////////////////////////////////////////////////////////////////////////
  // ChangePictureOptions class:

  /**
   * Encapsulated handling of ChromeOS change picture options page.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function ChangePictureOptions() {
    Page.call(this, 'changePicture',
              loadTimeData.getString('changePicturePage'),
              'change-picture-page');
  }

  cr.addSingletonGetter(ChangePictureOptions);

  ChangePictureOptions.prototype = {
    // Inherit ChangePictureOptions from Page.
    __proto__: Page.prototype,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      var imageGrid = $('user-image-grid');
      UserImagesGrid.decorate(imageGrid);

      // Preview image will track the selected item's URL.
      var previewElement = $('user-image-preview');
      previewElement.oncontextmenu = function(e) { e.preventDefault(); };

      imageGrid.previewElement = previewElement;
      imageGrid.selectionType = 'default';
      imageGrid.flipPhotoElement = $('flip-photo');

      imageGrid.addEventListener('select',
                                 this.handleImageSelected_.bind(this));
      imageGrid.addEventListener('activate',
                                 this.handleImageActivated_.bind(this));
      imageGrid.addEventListener('phototaken',
                                 this.handlePhotoTaken_.bind(this));
      imageGrid.addEventListener('photoupdated',
                                 this.handlePhotoTaken_.bind(this));

      // Add the "Choose file" button.
      imageGrid.addItem(ButtonImages.CHOOSE_FILE,
                        loadTimeData.getString('chooseFile'),
                        this.handleChooseFile_.bind(this)).type = 'file';

      // Profile image data.
      this.profileImage_ = imageGrid.addItem(
          ButtonImages.PROFILE_PICTURE,
          loadTimeData.getString('profilePhotoLoading'));
      this.profileImage_.type = 'profile';

      // Set the title for camera item in the grid.
      imageGrid.setCameraTitles(
          loadTimeData.getString('takePhoto'),
          loadTimeData.getString('photoFromCamera'));

      $('take-photo').addEventListener(
          'click', this.handleTakePhoto_.bind(this));
      $('discard-photo').addEventListener(
          'click', this.handleDiscardPhoto_.bind(this));

      // Toggle 'animation' class for the duration of WebKit transition.
      $('flip-photo').addEventListener(
          'click', this.handleFlipPhoto_.bind(this));
      $('user-image-stream-crop').addEventListener(
          'webkitTransitionEnd', function(e) {
            previewElement.classList.remove('animation');
          });
      $('user-image-preview-img').addEventListener(
          'webkitTransitionEnd', function(e) {
            previewElement.classList.remove('animation');
          });

      // Old user image data (if present).
      this.oldImage_ = null;

      $('change-picture-overlay-confirm').addEventListener(
          'click', this.closeOverlay_.bind(this));

      chrome.send('onChangePicturePageInitialized');
    },

    /** @override */
    didShowPage: function() {
      var imageGrid = $('user-image-grid');
      // Reset camera element.
      imageGrid.cameraImage = null;
      imageGrid.updateAndFocus();
      chrome.send('onChangePicturePageShown');
    },

    /** @override */
    willHidePage: function() {
      var imageGrid = $('user-image-grid');
      imageGrid.blur();  // Make sure the image grid is not active.
      imageGrid.stopCamera();
      if (this.oldImage_) {
        imageGrid.removeItem(this.oldImage_);
        this.oldImage_ = null;
      }
      chrome.send('onChangePicturePageHidden');
    },

    /**
     * Either willHidePage or didClosePage may be called depending on the way
     * the page was closed.
     * @override
     */
    didClosePage: function() {
      this.willHidePage();
    },

    /**
     * Closes the overlay, returning to the main settings page.
     * @private
     */
    closeOverlay_: function() {
      if (!$('change-picture-page').hidden)
        PageManager.closeOverlay();
    },

    /**
     * Handle camera-photo flip.
     */
    handleFlipPhoto_: function() {
      var imageGrid = $('user-image-grid');
      imageGrid.previewElement.classList.add('animation');
      imageGrid.flipPhoto = !imageGrid.flipPhoto;
      var flipMessageId = imageGrid.flipPhoto ?
         'photoFlippedAccessibleText' : 'photoFlippedBackAccessibleText';
      announceAccessibleMessage(loadTimeData.getString(flipMessageId));
    },

    /**
     * Handles "Take photo" button click.
     * @private
     */
    handleTakePhoto_: function() {
      $('user-image-grid').takePhoto();
      chrome.send('takePhoto');
    },

    /**
     * Handle photo captured event.
     * @param {Event} e Event with 'dataURL' property containing a data URL.
     */
    handlePhotoTaken_: function(e) {
      chrome.send('photoTaken', [e.dataURL]);
      announceAccessibleMessage(
          loadTimeData.getString('photoCaptureAccessibleText'));
    },

    /**
     * Handles "Discard photo" button click.
     * @private
     */
    handleDiscardPhoto_: function() {
      $('user-image-grid').discardPhoto();
      chrome.send('discardPhoto');
      announceAccessibleMessage(
          loadTimeData.getString('photoDiscardAccessibleText'));
    },

    /**
     * Handles "Choose a file" button activation.
     * @private
     */
    handleChooseFile_: function() {
      chrome.send('chooseFile');
      this.closeOverlay_();
    },

    /**
     * Handles image selection change.
     * @param {Event} e Selection change Event.
     * @private
     */
    handleImageSelected_: function(e) {
      var imageGrid = $('user-image-grid');
      var url = imageGrid.selectedItemUrl;

      // Flip button available only for camera picture.
      imageGrid.flipPhotoElement.hidden =
          imageGrid.selectionType != 'camera';
      // Ignore selection change caused by program itself and selection of one
      // of the action buttons.
      if (!imageGrid.inProgramSelection &&
          url != ButtonImages.TAKE_PHOTO && url != ButtonImages.CHOOSE_FILE) {
        chrome.send('selectImage', [url, imageGrid.selectionType]);
      }
      // Start/stop camera on (de)selection.
      if (!imageGrid.inProgramSelection &&
          imageGrid.selectionType != e.oldSelectionType) {
        if (imageGrid.selectionType == 'camera') {
          imageGrid.startCamera(
              function() {
                // Start capture if camera is still the selected item.
                return imageGrid.selectedItem == imageGrid.cameraImage;
              });
        } else {
          imageGrid.stopCamera();
        }
      }
      // Update image attribution text.
      var image = imageGrid.selectedItem;
      $('user-image-author-name').textContent = image.author;
      $('user-image-author-website').textContent = image.website;
      $('user-image-author-website').href = image.website;
      $('user-image-attribution').style.visibility =
          (image.author || image.website) ? 'visible' : 'hidden';
    },

    /**
     * Handles image activation (by pressing Enter).
     * @private
     */
    handleImageActivated_: function() {
      switch ($('user-image-grid').selectedItemUrl) {
        case ButtonImages.TAKE_PHOTO:
          this.handleTakePhoto_();
          break;
        case ButtonImages.CHOOSE_FILE:
          this.handleChooseFile_();
          break;
        default:
          this.closeOverlay_();
          break;
      }
    },

    /**
     * Adds or updates old user image taken from file/camera (neither a profile
     * image nor a default one).
     * @param {string} imageUrl Old user image, as data or internal URL.
     * @private
     */
    setOldImage_: function(imageUrl) {
      var imageGrid = $('user-image-grid');
      if (this.oldImage_) {
        this.oldImage_ = imageGrid.updateItem(this.oldImage_, imageUrl);
      } else {
        // Insert next to the profile image.
        var pos = imageGrid.indexOf(this.profileImage_) + 1;
        this.oldImage_ = imageGrid.addItem(imageUrl, undefined, undefined, pos);
        this.oldImage_.type = 'old';
        imageGrid.selectedItem = this.oldImage_;
      }
    },

    /**
     * Updates user's profile image.
     * @param {string} imageUrl Profile image, encoded as data URL.
     * @param {boolean} select If true, profile image should be selected.
     * @private
     */
    setProfileImage_: function(imageUrl, select) {
      var imageGrid = $('user-image-grid');
      this.profileImage_ = imageGrid.updateItem(
          this.profileImage_, imageUrl, loadTimeData.getString('profilePhoto'));
      if (select)
        imageGrid.selectedItem = this.profileImage_;
    },

    /**
     * Selects user image with the given URL.
     * @param {string} url URL of the image to select.
     * @private
     */
    setSelectedImage_: function(url) {
      $('user-image-grid').selectedItemUrl = url;
    },

    /**
     * @param {boolean} present Whether camera is detected.
     */
    setCameraPresent_: function(present) {
      $('user-image-grid').cameraPresent = present;
    },

    /**
     * Appends default images to the image grid. Should only be called once.
     * @param {Array<{url: string, author: string, website: string}>}
     *   imagesData An array of default images data, including URL, author and
     *   website.
     * @private
     */
    setDefaultImages_: function(imagesData) {
      $('user-image-grid').setDefaultImages(imagesData);
    },
  };

  // Forward public APIs to private implementations.
  cr.makePublic(ChangePictureOptions, [
    'closeOverlay',
    'setCameraPresent',
    'setDefaultImages',
    'setOldImage',
    'setProfileImage',
    'setSelectedImage',
  ]);

  // Export
  return {
    ChangePictureOptions: ChangePictureOptions
  };

});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options.internet', function() {
  /** @const */ var EditableTextField = options.EditableTextField;

  /**
   * The regular expression that matches an IP address. String to match against
   * should have all whitespace stripped already.
   * @const
   * @type {RegExp}
   */
  var singleIp_ = /^([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+)$/;

  /**
   * Creates a new field specifically for entering IP addresses.
   * @constructor
   * @extends {options.EditableTextField}
   */
  function IPAddressField() {
    var el = cr.doc.createElement('div');
    IPAddressField.decorate(el);
    return el;
  }

  /**
   * Decorates an element as a inline-editable list item. Note that this is
   * a subclass of IPAddressField.
   * @param {!HTMLElement} el The element to decorate.
   */
  IPAddressField.decorate = function(el) {
    el.__proto__ = IPAddressField.prototype;
    el.decorate();
  };

  IPAddressField.prototype = {
    __proto__: EditableTextField.prototype,

    /** @override */
    decorate: function() {
      EditableTextField.prototype.decorate.call(this);
    },

    /**
     * Indicates whether or not empty values are allowed.
     * @type {boolean}
     */
    get allowEmpty() {
      return this.hasAttribute('allow-empty');
    },

    /** @override */
    get currentInputIsValid() {
      if (!this.editField.value && this.allowEmpty)
        return true;

      // Make sure it's only got numbers and ".", there are the correct
      // count of them, and they are all within the correct range.
      var fieldValue = this.editField.value.replace(/\s/g, '');
      var matches = singleIp_.exec(fieldValue);
      var rangeCorrect = true;
      if (matches != null) {
        for (var i = 1; i < matches.length; ++i) {
          var value = parseInt(matches[i], 10);
          if (value < 0 || value > 255) {
            rangeCorrect = false;
            break;
          }
        }
      }
      return this.editField.validity.valid && matches != null &&
          rangeCorrect && matches.length == 5;
    },

    /** @override */
    get hasBeenEdited() {
      return this.editField.value != this.model.value;
    },

    /**
     * Overrides superclass to mutate the input during a successful commit. For
     * the purposes of entering IP addresses, this just means stripping off
     * whitespace and leading zeros from each of the octets so that they conform
     * to the normal format for IP addresses.
     * @override
     * @param {string} value Input IP address to be mutated.
     * @return {string} mutated IP address.
     */
    mutateInput: function(value) {
      if (!value)
        return value;

      var fieldValue = value.replace(/\s/g, '');
      var matches = singleIp_.exec(fieldValue);
      var result = [];

      // If we got this far, matches shouldn't be null, but make sure.
      if (matches != null) {
        // starting at one because the first match element contains the entire
        // match, and we don't care about that.
        for (var i = 1; i < matches.length; ++i)
          result.push(parseInt(matches[i], 10));
      }
      return result.join('.');
    },
  };

  return {
    IPAddressField: IPAddressField,
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// require: onc_data.js

// NOTE(stevenjb): This code is in the process of being converted to be
// compatible with the networkingPrivate extension API:
// * The network property dictionaries are being converted to use ONC values.
// * chrome.send calls will be replaced with chrome.networkingPrivate calls.
// See crbug.com/279351 for more info.

cr.define('options.internet', function() {
  var OncData = cr.onc.OncData;
  var Page = cr.ui.pageManager.Page;
  var PageManager = cr.ui.pageManager.PageManager;
  /** @const */ var IPAddressField = options.internet.IPAddressField;

  /** @const */ var GoogleNameServers = ['8.8.4.4', '8.8.8.8'];
  /** @const */ var CarrierSprint = 'Sprint';
  /** @const */ var CarrierVerizon = 'Verizon Wireless';

  /**
   * Helper function to set hidden attribute for elements matching a selector.
   * @param {string} selector CSS selector for extracting a list of elements.
   * @param {boolean} hidden New hidden value.
   */
  function updateHidden(selector, hidden) {
    var elements = cr.doc.querySelectorAll(selector);
    for (var i = 0, el; el = elements[i]; i++) {
      el.hidden = hidden;
    }
  }

  /**
   * Helper function to update the properties of the data object from the
   * properties in the update object.
   * @param {Object} data Object to update.
   * @param {Object} update Object containing the updated properties.
   */
  function updateDataObject(data, update) {
    for (var prop in update) {
      if (prop in data)
        data[prop] = update[prop];
    }
  }

  /**
   * Monitor pref change of given element.
   * @param {Element} el Target element.
   */
  function observePrefsUI(el) {
    Preferences.getInstance().addEventListener(el.pref, handlePrefUpdate);
  }

  /**
   * UI pref change handler.
   * @param {Event} e The update event.
   */
  function handlePrefUpdate(e) {
    DetailsInternetPage.getInstance().updateControls();
  }

  /**
   * Simple helper method for converting a field to a string. It is used to
   * easily assign an empty string from fields that may be unknown or undefined.
   * @param {Object} value that should be converted to a string.
   * @return {string} the result.
   */
  function stringFromValue(value) {
    return value ? String(value) : '';
  }

  /**
   * @param {string} action An action to send to coreOptionsUserMetricsAction.
   */
  function sendChromeMetricsAction(action) {
    chrome.send('coreOptionsUserMetricsAction', [action]);
  }

  /**
   * Send metrics to Chrome when the detailed page is opened.
   * @param {string} type The ONC type of the network being shown.
   * @param {string} state The ONC network state.
   */
  function sendShowDetailsMetrics(type, state) {
    if (type == 'WiFi') {
      sendChromeMetricsAction('Options_NetworkShowDetailsWifi');
      if (state != 'NotConnected')
        sendChromeMetricsAction('Options_NetworkShowDetailsWifiConnected');
    } else if (type == 'Cellular') {
      sendChromeMetricsAction('Options_NetworkShowDetailsCellular');
      if (state != 'NotConnected')
        sendChromeMetricsAction('Options_NetworkShowDetailsCellularConnected');
    } else if (type == 'VPN') {
      sendChromeMetricsAction('Options_NetworkShowDetailsVPN');
      if (state != 'NotConnected')
        sendChromeMetricsAction('Options_NetworkShowDetailsVPNConnected');
    }
  }

  /**
   * Returns the netmask as a string for a given prefix length.
   * @param {number} prefixLength The ONC routing prefix length.
   * @return {string} The corresponding netmask.
   */
  function prefixLengthToNetmask(prefixLength) {
    // Return the empty string for invalid inputs.
    if (prefixLength < 0 || prefixLength > 32)
      return '';
    var netmask = '';
    for (var i = 0; i < 4; ++i) {
      var remainder = 8;
      if (prefixLength >= 8) {
        prefixLength -= 8;
      } else {
        remainder = prefixLength;
        prefixLength = 0;
      }
      if (i > 0)
        netmask += '.';
      var value = 0;
      if (remainder != 0)
        value = ((2 << (remainder - 1)) - 1) << (8 - remainder);
      netmask += value.toString();
    }
    return netmask;
  }

  /**
   * Returns the prefix length from the netmask string.
   * @param {string} netmask The netmask string, e.g. 255.255.255.0.
   * @return {number} The corresponding netmask or -1 if invalid.
   */
  function netmaskToPrefixLength(netmask) {
    var prefixLength = 0;
    var tokens = netmask.split('.');
    if (tokens.length != 4)
      return -1;
    for (var i = 0; i < tokens.length; ++i) {
      var token = tokens[i];
      // If we already found the last mask and the current one is not
      // '0' then the netmask is invalid. For example, 255.224.255.0
      if (prefixLength / 8 != i) {
        if (token != '0')
          return -1;
      } else if (token == '255') {
        prefixLength += 8;
      } else if (token == '254') {
        prefixLength += 7;
      } else if (token == '252') {
        prefixLength += 6;
      } else if (token == '248') {
        prefixLength += 5;
      } else if (token == '240') {
        prefixLength += 4;
      } else if (token == '224') {
        prefixLength += 3;
      } else if (token == '192') {
        prefixLength += 2;
      } else if (token == '128') {
        prefixLength += 1;
      } else if (token == '0') {
        prefixLength += 0;
      } else {
        // mask is not a valid number.
        return -1;
      }
    }
    return prefixLength;
  }

  // Returns true if we should show the 'View Account' button for |onc|.
  // TODO(stevenjb): We should query the Mobile Config API for whether or not to
  // show the 'View Account' button once it is integrated with Settings.
  function shouldShowViewAccountButton(onc) {
    var activationState = onc.getActiveValue('Cellular.ActivationState');
    if (activationState != 'Activating' && activationState != 'Activated')
      return false;

    // If no online payment URL was provided by Shill, only show 'View Account'
    // for Verizon Wireless.
    if (!onc.getActiveValue('Cellular.PaymentPortal.Url') &&
        onc.getActiveValue('Cellular.Carrier') != CarrierVerizon) {
      return false;
    }

    // 'View Account' should only be shown for connected networks, or
    // disconnected LTE networks with a valid MDN.
    var connectionState = onc.getActiveValue('ConnectionState');
    if (connectionState != 'Connected') {
      var technology = onc.getActiveValue('Cellular.NetworkTechnology');
      if (technology != 'LTE' && technology != 'LTEAdvanced')
        return false;
      if (!onc.getActiveValue('Cellular.MDN'))
        return false;
    }

    return true;
  }

  /////////////////////////////////////////////////////////////////////////////
  // DetailsInternetPage class:

  /**
   * Encapsulated handling of ChromeOS internet details overlay page.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function DetailsInternetPage() {
    // If non-negative, indicates a custom entry in select-apn.
    this.userApnIndex_ = -1;

    // The custom APN properties associated with entry |userApnIndex_|.
    this.userApn_ = {};

    // The currently selected APN entry in $('select-apn') (which may or may not
    // == userApnIndex_).
    this.selectedApnIndex_ = -1;

    // We show the Proxy configuration tab for remembered networks and when
    // configuring a proxy from the login screen.
    this.showProxy_ = false;

    Page.call(this, 'detailsInternetPage', '', 'details-internet-page');
  }

  cr.addSingletonGetter(DetailsInternetPage);

  DetailsInternetPage.prototype = {
    __proto__: Page.prototype,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);
      this.initializePageContents_();

      chrome.networkingPrivate.onNetworksChanged.addListener(
          this.onNetworksChanged_.bind(this));

      this.showNetworkDetails_();
    },

    /**
     * Automatically shows the network details dialog if network information
     * is included in the URL.
     */
    showNetworkDetails_: function() {
      var guid = parseQueryParams(window.location).guid;
      if (!guid || !guid.length)
        return;
      chrome.networkingPrivate.getManagedProperties(
          guid, DetailsInternetPage.initializeDetailsPage);
    },

    /**
     * networkingPrivate callback when networks change.
     * @param {Array<string>} changes List of GUIDs whose properties have
     *     changed.
     * @private
     */
    onNetworksChanged_: function(changes) {
      if (!this.onc_)
        return;
      var guid = this.onc_.guid();
      if (changes.indexOf(guid) != -1) {
        chrome.networkingPrivate.getManagedProperties(
          guid, DetailsInternetPage.updateConnectionData);
      }
    },

    /**
     * Initializes the contents of the page.
     */
    initializePageContents_: function() {
      $('details-internet-dismiss').addEventListener('click', function(event) {
        DetailsInternetPage.setDetails();
      });

      $('details-internet-login').addEventListener('click', function(event) {
        DetailsInternetPage.setDetails();
        DetailsInternetPage.loginFromDetails();
      });

      $('details-internet-disconnect').addEventListener('click',
                                                        function(event) {
        DetailsInternetPage.setDetails();
        DetailsInternetPage.disconnectNetwork();
      });

      $('details-internet-configure').addEventListener('click',
                                                       function(event) {
        DetailsInternetPage.setDetails();
        DetailsInternetPage.configureNetwork();
      });

      $('activate-details').addEventListener('click', function(event) {
        DetailsInternetPage.activateFromDetails();
      });

      $('view-account-details').addEventListener('click', function(event) {
        chrome.send('showMorePlanInfo',
                    [DetailsInternetPage.getInstance().onc_.guid()]);
        PageManager.closeOverlay();
      });

      $('cellular-apn-use-default').addEventListener('click', function(event) {
        DetailsInternetPage.getInstance().setDefaultApn_();
      });

      $('cellular-apn-set').addEventListener('click', function(event) {
        DetailsInternetPage.getInstance().setApn_($('cellular-apn').value);
      });

      $('cellular-apn-cancel').addEventListener('click', function(event) {
        DetailsInternetPage.getInstance().cancelApn_();
      });

      $('select-apn').addEventListener('change', function(event) {
        DetailsInternetPage.getInstance().selectApn_();
      });

      $('sim-card-lock-enabled').addEventListener('click', function(event) {
        var newValue = $('sim-card-lock-enabled').checked;
        // Leave value as is because user needs to enter PIN code first.
        // When PIN will be entered and value changed,
        // we'll update UI to reflect that change.
        $('sim-card-lock-enabled').checked = !newValue;
        var operation = newValue ? 'setLocked' : 'setUnlocked';
        chrome.send('simOperation', [operation]);
      });
      $('change-pin').addEventListener('click', function(event) {
        chrome.send('simOperation', ['changePin']);
      });

      // Proxy
      ['proxy-host-single-port',
       'secure-proxy-port',
       'socks-port',
       'ftp-proxy-port',
       'proxy-host-port'
      ].forEach(function(id) {
        options.PrefPortNumber.decorate($(id));
      });

      options.proxyexceptions.ProxyExceptions.decorate($('ignored-host-list'));
      $('remove-host').addEventListener('click',
                                        this.handleRemoveProxyExceptions_);
      $('add-host').addEventListener('click', this.handleAddProxyException_);
      $('direct-proxy').addEventListener('click', this.disableManualProxy_);
      $('manual-proxy').addEventListener('click', this.enableManualProxy_);
      $('auto-proxy').addEventListener('click', this.disableManualProxy_);
      $('proxy-all-protocols').addEventListener('click',
                                                this.toggleSingleProxy_);
      $('proxy-use-pac-url').addEventListener('change',
                                              this.handleAutoConfigProxy_);

      observePrefsUI($('direct-proxy'));
      observePrefsUI($('manual-proxy'));
      observePrefsUI($('auto-proxy'));
      observePrefsUI($('proxy-all-protocols'));
      observePrefsUI($('proxy-use-pac-url'));

      $('ip-automatic-configuration-checkbox').addEventListener('click',
        this.handleIpAutoConfig_);
      $('automatic-dns-radio').addEventListener('click',
        this.handleNameServerTypeChange_);
      $('google-dns-radio').addEventListener('click',
        this.handleNameServerTypeChange_);
      $('user-dns-radio').addEventListener('click',
        this.handleNameServerTypeChange_);

      // We only load this string if we have the string data available
      // because the proxy settings page on the login screen re-uses the
      // proxy sub-page from the internet options, and it doesn't ever
      // show the DNS settings, so we don't need this string there.
      // The string isn't available because
      // http://chromesettings.github.io/settings-frame/strings.js (where the string is
      // stored) is not accessible from the login screen.
      // TODO(pneubeck): Remove this once i18n of the proxy dialog on the login
      // page is fixed. http://crbug.com/242865
      if (loadTimeData.data_) {
        $('google-dns-label').innerHTML =
            loadTimeData.getString('googleNameServers');
      }
    },

    /**
     * Handler for "add" event fired from userNameEdit.
     * @param {Event} e Add event fired from userNameEdit.
     * @private
     */
    handleAddProxyException_: function(e) {
      var exception = $('new-host').value;
      $('new-host').value = '';

      exception = exception.trim();
      if (exception)
        $('ignored-host-list').addException(exception);
    },

    /**
     * Handler for when the remove button is clicked
     * @param {Event} e The click event.
     * @private
     */
    handleRemoveProxyExceptions_: function(e) {
      var selectedItems = $('ignored-host-list').selectedItems;
      for (var x = 0; x < selectedItems.length; x++) {
        $('ignored-host-list').removeException(selectedItems[x]);
      }
    },

    /**
     * Handler for when the IP automatic configuration checkbox is clicked.
     * @param {Event} e The click event.
     * @private
     */
    handleIpAutoConfig_: function(e) {
      var checked = $('ip-automatic-configuration-checkbox').checked;
      var fields = [$('ip-address'), $('ip-netmask'), $('ip-gateway')];
      for (var i = 0; i < fields.length; ++i) {
        fields[i].editable = !checked;
        if (checked) {
          var model = fields[i].model;
          model.value = model.automatic;
          fields[i].model = model;
        }
      }
      if (!checked)
        $('ip-address').focus();
    },

    /**
     * Handler for when the name server selection changes.
     * @param {Event} event The click event.
     * @private
     */
    handleNameServerTypeChange_: function(event) {
      var type = event.target.value;
      DetailsInternetPage.updateNameServerDisplay(type);
    },

    /**
     * Gets the IPConfig ONC Object.
     * @param {string} nameServerType The selected name server type:
     *   'automatic', 'google', or 'user'.
     * @return {Object} The IPConfig ONC object.
     * @private
     */
    getIpConfig_: function(nameServerType) {
      var ipConfig = {};
      // If 'ip-address' is empty, automatic configuration will be used.
      if (!$('ip-automatic-configuration-checkbox').checked &&
          $('ip-address').model.value) {
        ipConfig['IPAddress'] = $('ip-address').model.value;
        var netmask = $('ip-netmask').model.value;
        var routingPrefix = 0;
        if (netmask) {
          routingPrefix = netmaskToPrefixLength(netmask);
          if (routingPrefix == -1) {
            console.error('Invalid netmask: ' + netmask);
            routingPrefix = 0;
          }
        }
        ipConfig['RoutingPrefix'] = routingPrefix;
        ipConfig['Gateway'] = $('ip-gateway').model.value || '';
      }

      // Note: If no nameserver fields are set, automatic configuration will be
      // used. TODO(stevenjb): Validate input fields.
      if (nameServerType != 'automatic') {
        var userNameServers = [];
        if (nameServerType == 'google') {
          userNameServers = GoogleNameServers.slice();
        } else if (nameServerType == 'user') {
          for (var i = 1; i <= 4; ++i) {
            var nameServerField = $('ipconfig-dns' + i);
            // Skip empty values.
            if (nameServerField && nameServerField.model &&
                nameServerField.model.value) {
              userNameServers.push(nameServerField.model.value);
            }
          }
        }
        if (userNameServers.length)
          ipConfig['NameServers'] = userNameServers.sort();
      }
      return ipConfig;
    },

    /**
     * Creates an indicator event for controlled properties using
     * the same dictionary format as CoreOptionsHandler::CreateValueForPref.
     * @param {string} name The name for the Event.
     * @param {{value: *, controlledBy: *, recommendedValue: *}} propData
     *     Property dictionary.
     * @private
     */
    createControlledEvent_: function(name, propData) {
      assert('value' in propData && 'controlledBy' in propData &&
             'recommendedValue' in propData);
      var event = new Event(name);
      event.value = {
        value: propData.value,
        controlledBy: propData.controlledBy,
        recommendedValue: propData.recommendedValue
      };
      return event;
    },

    /**
     * Creates an indicator event for controlled properties using
     * the ONC getManagedProperties dictionary format.
     * @param {string} name The name for the Event.
     * @param {Object} propData ONC managed network property dictionary.
     * @private
     */
    createManagedEvent_: function(name, propData) {
      var event = new Event(name);
      event.value = {};

      // Set the current value and recommended value.
      var activeValue = propData['Active'];
      var effective = propData['Effective'];
      if (activeValue == undefined)
        activeValue = propData[effective];
      event.value.value = activeValue;

      // If a property is editable then it is not enforced, and 'controlledBy'
      // is set to 'recommended' unless effective == {User|Shared}Setting, in
      // which case the value was modified from the recommended value.
      // Otherwise if 'Effective' is set to 'UserPolicy' or 'DevicePolicy' then
      // the set value is mandated by the policy.
      if (propData['UserEditable']) {
        if (effective == 'UserPolicy')
          event.value.controlledBy = 'recommended';
        event.value.recommendedValue = propData['UserPolicy'];
      } else if (propData['DeviceEditable']) {
        if (effective == 'DevicePolicy')
          event.value.controlledBy = 'recommended';
        event.value.recommendedValue = propData['DevicePolicy'];
      } else if (effective == 'UserPolicy' || effective == 'DevicePolicy') {
        event.value.controlledBy = 'policy';
      }

      return event;
    },

    /**
     * Update details page controls.
     */
    updateControls: function() {
      // Note: onc may be undefined when called from a pref update before
      // initialized in initializeDetailsPage.
      var onc = this.onc_;

      // Always show the ipconfig section. TODO(stevenjb): Improve the display
      // for unconnected networks. Currently the IP address fields may be
      // blank if the network is not connected.
      $('ipconfig-section').hidden = false;
      $('ipconfig-dns-section').hidden = false;

      // Network type related.
      updateHidden('#details-internet-page .cellular-details',
                   this.type_ != 'Cellular');
      updateHidden('#details-internet-page .wifi-details',
                   this.type_ != 'WiFi');
      updateHidden('#details-internet-page .wimax-details',
                   this.type_ != 'WiMAX');
      updateHidden('#details-internet-page .vpn-details', this.type_ != 'VPN');
      updateHidden('#details-internet-page .proxy-details', !this.showProxy_);

      // Cellular
      if (onc && this.type_ == 'Cellular') {
        // Hide gsm/cdma specific elements.
        if (onc.getActiveValue('Cellular.Family') == 'GSM')
          updateHidden('#details-internet-page .cdma-only', true);
        else
          updateHidden('#details-internet-page .gsm-only', true);
      }

      // Wifi

      // Hide network tab for VPN.
      updateHidden('#details-internet-page .network-details',
                   this.type_ == 'VPN');

      // Password and shared.
      var source = onc ? onc.getSource() : 'None';
      var shared = (source == 'Device' || source == 'DevicePolicy');
      var security = onc ? onc.getWiFiSecurity() : 'None';
      updateHidden('#details-internet-page #password-details',
                   this.type_ != 'WiFi' || security == 'None');
      updateHidden('#details-internet-page #wifi-shared-network', !shared);
      updateHidden('#details-internet-page #prefer-network', source == 'None');

      // WiMAX.
      updateHidden('#details-internet-page #wimax-shared-network', !shared);

      // Proxy
      this.updateProxyBannerVisibility_();
      this.toggleSingleProxy_();
      if ($('manual-proxy').checked)
        this.enableManualProxy_();
      else
        this.disableManualProxy_();
    },

    /**
     * Updates info banner visibility state. This function shows the banner
     * if proxy is managed or shared-proxies is off for shared network.
     * @private
     */
    updateProxyBannerVisibility_: function() {
      var bannerDiv = $('network-proxy-info-banner');
      if (!loadTimeData.data_) {
        // TODO(pneubeck): This temporarily prevents an exception below until
        // i18n of the proxy dialog on the login page is
        // fixed. http://crbug.com/242865
        bannerDiv.hidden = true;
        return;
      }

      // Show banner and determine its message if necessary.
      var controlledBy = $('direct-proxy').controlledBy;
      if (!controlledBy || controlledBy == '') {
        bannerDiv.hidden = true;
      } else {
        bannerDiv.hidden = false;
        // The possible banner texts are loaded in proxy_handler.cc.
        var bannerText = 'proxyBanner' + controlledBy.charAt(0).toUpperCase() +
                         controlledBy.slice(1);
        $('banner-text').textContent = loadTimeData.getString(bannerText);
      }
    },

    /**
     * Handler for when the user clicks on the checkbox to allow a
     * single proxy usage.
     * @private
     */
    toggleSingleProxy_: function() {
      if ($('proxy-all-protocols').checked) {
        $('multi-proxy').hidden = true;
        $('single-proxy').hidden = false;
      } else {
        $('multi-proxy').hidden = false;
        $('single-proxy').hidden = true;
      }
    },

    /**
     * Handler for when the user clicks on the checkbox to enter
     * auto configuration URL.
     * @private
     */
    handleAutoConfigProxy_: function() {
      $('proxy-pac-url').disabled = !$('proxy-use-pac-url').checked;
    },

    /**
     * Handler for selecting a radio button that will disable the manual
     * controls.
     * @private
     */
    disableManualProxy_: function() {
      $('ignored-host-list').disabled = true;
      $('new-host').disabled = true;
      $('remove-host').disabled = true;
      $('add-host').disabled = true;
      $('proxy-all-protocols').disabled = true;
      $('proxy-host-name').disabled = true;
      $('proxy-host-port').disabled = true;
      $('proxy-host-single-name').disabled = true;
      $('proxy-host-single-port').disabled = true;
      $('secure-proxy-host-name').disabled = true;
      $('secure-proxy-port').disabled = true;
      $('ftp-proxy').disabled = true;
      $('ftp-proxy-port').disabled = true;
      $('socks-host').disabled = true;
      $('socks-port').disabled = true;
      $('proxy-use-pac-url').disabled = $('auto-proxy').disabled ||
                                        !$('auto-proxy').checked;
      $('proxy-pac-url').disabled = $('proxy-use-pac-url').disabled ||
                                    !$('proxy-use-pac-url').checked;
      $('auto-proxy-parms').hidden = !$('auto-proxy').checked;
      $('manual-proxy-parms').hidden = !$('manual-proxy').checked;
      sendChromeMetricsAction('Options_NetworkManualProxy_Disable');
    },

    /**
     * Handler for selecting a radio button that will enable the manual
     * controls.
     * @private
     */
    enableManualProxy_: function() {
      $('ignored-host-list').redraw();
      var allDisabled = $('manual-proxy').disabled;
      $('ignored-host-list').disabled = allDisabled;
      $('new-host').disabled = allDisabled;
      $('remove-host').disabled = allDisabled;
      $('add-host').disabled = allDisabled;
      $('proxy-all-protocols').disabled = allDisabled;
      $('proxy-host-name').disabled = allDisabled;
      $('proxy-host-port').disabled = allDisabled;
      $('proxy-host-single-name').disabled = allDisabled;
      $('proxy-host-single-port').disabled = allDisabled;
      $('secure-proxy-host-name').disabled = allDisabled;
      $('secure-proxy-port').disabled = allDisabled;
      $('ftp-proxy').disabled = allDisabled;
      $('ftp-proxy-port').disabled = allDisabled;
      $('socks-host').disabled = allDisabled;
      $('socks-port').disabled = allDisabled;
      $('proxy-use-pac-url').disabled = true;
      $('proxy-pac-url').disabled = true;
      $('auto-proxy-parms').hidden = !$('auto-proxy').checked;
      $('manual-proxy-parms').hidden = !$('manual-proxy').checked;
      sendChromeMetricsAction('Options_NetworkManualProxy_Enable');
    },

    /**
     * Helper method called from initializeDetailsPage and updateConnectionData.
     * Updates visibility/enabled of the login/disconnect/configure buttons.
     * @private
     */
    updateConnectionButtonVisibility_: function() {
      var onc = this.onc_;

      var prohibitedByPolicy =
          this.type_ == 'WiFi' &&
          loadTimeData.valueExists('allowOnlyPolicyNetworksToConnect') &&
          loadTimeData.getBoolean('allowOnlyPolicyNetworksToConnect') &&
          (onc.data_.Source != 'DevicePolicy' &&
           onc.data_.Source != 'UserPolicy');

      if (this.type_ == 'Ethernet') {
        // Ethernet can never be connected or disconnected and can always be
        // configured (e.g. to set security).
        $('details-internet-login').hidden = true;
        $('details-internet-disconnect').hidden = true;
        $('details-internet-configure').hidden = false;
        return;
      }

      var connectable = onc.getActiveValue('Connectable');
      var connectState = onc.getActiveValue('ConnectionState');
      if (connectState == 'NotConnected') {
        $('details-internet-disconnect').hidden = true;
        $('details-internet-login').hidden = false;
        // Connecting to an unconfigured network might trigger certificate
        // installation UI. Until that gets handled here, always enable the
        // Connect button for built-in networks.
        var enabled = ((this.type_ != 'VPN') ||
                      (onc.getActiveValue('VPN.Type') != 'ThirdPartyVPN') ||
                      connectable) && !prohibitedByPolicy;
        if (prohibitedByPolicy) {
          $('details-internet-login').setAttribute(
              'title', loadTimeData.getString('prohibitedNetwork'));
        } else {
          $('details-internet-login').removeAttribute('title');
        }
        $('details-internet-login').disabled = !enabled;
      } else {
        $('details-internet-login').hidden = true;
        $('details-internet-disconnect').hidden = false;
      }

      var showConfigure = false;
      if (this.type_ == 'VPN') {
        showConfigure = true;
      } else if (this.type_ == 'WiMAX' && connectState == 'NotConnected') {
        showConfigure = true;
      } else if (this.type_ == 'WiFi') {
        showConfigure = (connectState == 'NotConnected' &&
                         (!connectable || onc.getWiFiSecurity() != 'None') &&
                         !prohibitedByPolicy);
      }
      $('details-internet-configure').hidden = !showConfigure;
    },

    /**
     * Helper method called from initializeDetailsPage and updateConnectionData.
     * Updates the connection state property and account / sim card links.
     * @private
     */
    updateDetails_: function() {
      var onc = this.onc_;

      var connectionStateString = onc.getTranslatedValue('ConnectionState');
      $('connection-state').textContent = connectionStateString;

      var type = this.type_;
      var showViewAccount = false;
      var showActivate = false;
      if (type == 'WiFi') {
        $('wifi-connection-state').textContent = connectionStateString;
      } else if (type == 'WiMAX') {
        $('wimax-connection-state').textContent = connectionStateString;
      } else if (type == 'Cellular') {
        $('activation-state').textContent =
            onc.getTranslatedValue('Cellular.ActivationState');
        if (onc.getActiveValue('Cellular.Family') == 'GSM') {
          var lockEnabled =
              onc.getActiveValue('Cellular.SIMLockStatus.LockEnabled');
          $('sim-card-lock-enabled').checked = lockEnabled;
          $('change-pin').hidden = !lockEnabled;
        }
        showViewAccount = shouldShowViewAccountButton(onc);
        var activationState = onc.getActiveValue('Cellular.ActivationState');
        showActivate = (activationState == 'NotActivated' ||
                        activationState == 'PartiallyActivated');
      }

      $('view-account-details').hidden = !showViewAccount;
      $('activate-details').hidden = !showActivate;
      // If activation is not complete, hide the login button.
      if (showActivate)
        $('details-internet-login').hidden = true;
    },

    /**
     * Helper method called from initializeDetailsPage and updateConnectionData.
     * Updates the fields in the header section of the details frame.
     * @private
     */
    populateHeader_: function() {
      var onc = this.onc_;

      var name = onc.getTranslatedValue('Name');
      if (onc.getActiveValue('Type') == 'VPN' &&
          onc.getActiveValue('VPN.Type') == 'ThirdPartyVPN') {
        var providerName =
            onc.getActiveValue('VPN.ThirdPartyVPN.ProviderName') ||
            loadTimeData.getString('defaultThirdPartyProviderName');
        name = loadTimeData.getStringF('vpnNameTemplate', providerName, name);
      }
      $('network-details-title').textContent = name;

      var connectionStateString = onc.getTranslatedValue('ConnectionState');
      $('network-details-subtitle-status').textContent = connectionStateString;

      var typeKey;
      var type = this.type_;
      if (type == 'Ethernet')
        typeKey = 'ethernetTitle';
      else if (type == 'WiFi')
        typeKey = 'wifiTitle';
      else if (type == 'WiMAX')
        typeKey = 'wimaxTitle';
      else if (type == 'Cellular')
        typeKey = 'cellularTitle';
      else if (type == 'VPN')
        typeKey = 'vpnTitle';
      else
        typeKey = null;
      var typeLabel = $('network-details-subtitle-type');
      var typeSeparator = $('network-details-subtitle-separator');
      if (typeKey) {
        typeLabel.textContent = loadTimeData.getString(typeKey);
        typeLabel.hidden = false;
        typeSeparator.hidden = false;
      } else {
        typeLabel.hidden = true;
        typeSeparator.hidden = true;
      }
    },

    /**
     * Helper method to insert a 'user' option into the Apn list.
     * @param {Object} userOption The 'user' apn dictionary
     * @private
     */
    insertApnUserOption_: function(userOption) {
      // Add the 'user' option before the last option ('other')
      var apnSelector = $('select-apn');
      assert(apnSelector.length > 0);
      var otherOption = apnSelector[apnSelector.length - 1];
      apnSelector.add(userOption, otherOption);
      this.userApnIndex_ = apnSelector.length - 2;
      this.selectedApnIndex_ = this.userApnIndex_;
    },

    /**
     * Helper method called from initializeApnList to populate the Apn list.
     * @param {Array} apnList List of available APNs.
     * @private
     */
    populateApnList_: function(apnList) {
      var onc = this.onc_;
      var apnSelector = $('select-apn');
      assert(apnSelector.length == 1);
      var otherOption = apnSelector[0];
      var activeApn = onc.getActiveValue('Cellular.APN.AccessPointName');
      var lastGoodApn =
          onc.getActiveValue('Cellular.LastGoodAPN.AccessPointName');
      for (var i = 0; i < apnList.length; i++) {
        var apnDict = apnList[i];
        var localizedName = apnDict['LocalizedName'];
        var name = localizedName ? localizedName : apnDict['Name'];
        var accessPointName = apnDict['AccessPointName'];
        var option = document.createElement('option');
        option.textContent =
            name ? (name + ' (' + accessPointName + ')') : accessPointName;
        option.value = i;
        // Insert new option before 'other' option.
        apnSelector.add(option, otherOption);
        if (this.selectedApnIndex_ != -1)
          continue;
        // If this matches the active Apn name, or LastGoodApn name (or there
        // is no last good APN), set it as the selected Apn.
        if ((activeApn == accessPointName) ||
            (!activeApn && (!lastGoodApn || lastGoodApn == accessPointName))) {
          this.selectedApnIndex_ = i;
        }
      }
      if (this.selectedApnIndex_ == -1 && activeApn) {
        this.userApn_ = activeApn;
        // Create a 'user' entry for any active apn not in the list.
        var userOption = document.createElement('option');
        userOption.textContent = activeApn;
        userOption.value = -1;
        this.insertApnUserOption_(userOption);
      }
    },

    /**
     * Helper method called from initializeDetailsPage to initialize the Apn
     * list.
     * @private
     */
    initializeApnList_: function() {
      this.selectedApnIndex_ = -1;
      this.userApnIndex_ = -1;

      var onc = this.onc_;
      var apnSelector = $('select-apn');

      // Clear APN lists, keep only last element, 'other'.
      while (apnSelector.length != 1)
        apnSelector.remove(0);

      var apnList = onc.getActiveValue('Cellular.APNList');
      if (apnList) {
        // Populate the list with the existing APNs.
        this.populateApnList_(apnList);
      } else {
        // Create a single 'default' entry.
        var otherOption = apnSelector[0];
        var defaultOption = document.createElement('option');
        defaultOption.textContent =
            loadTimeData.getString('cellularApnUseDefault');
        defaultOption.value = -1;
        // Add 'default' entry before 'other' option
        apnSelector.add(defaultOption, otherOption);
        assert(apnSelector.length == 2);  // 'default', 'other'
        this.selectedApnIndex_ = 0;  // Select 'default'
      }
      assert(this.selectedApnIndex_ >= 0);
      apnSelector.selectedIndex = this.selectedApnIndex_;
      updateHidden('.apn-list-view', false);
      updateHidden('.apn-details-view', true);
    },

    /**
     * Helper function for setting APN properties.
     * @param {Object} apnValue Dictionary of APN properties.
     * @private
     */
    setActiveApn_: function(apnValue) {
      var activeApn = {};
      var apnName = apnValue['AccessPointName'];
      if (apnName) {
        activeApn['AccessPointName'] = apnName;
        activeApn['Username'] = stringFromValue(apnValue['Username']);
        activeApn['Password'] = stringFromValue(apnValue['Password']);
      }
      // Set the cached ONC data.
      this.onc_.setProperty('Cellular.APN', activeApn);
      // Set an ONC object with just the APN values.
      var oncData = new OncData({});
      oncData.setProperty('Cellular.APN', activeApn);
      chrome.networkingPrivate.setProperties(this.onc_.guid(),
                                             oncData.getData());
    },

    /**
     * Event Listener for the cellular-apn-use-default button.
     * @private
     */
    setDefaultApn_: function() {
      var apnSelector = $('select-apn');

      // Remove the 'user' entry if it exists.
      if (this.userApnIndex_ != -1) {
        assert(this.userApnIndex_ < apnSelector.length - 1);
        apnSelector.remove(this.userApnIndex_);
        this.userApnIndex_ = -1;
      }

      var apnList = this.onc_.getActiveValue('Cellular.APNList');
      var iApn = (apnList != undefined && apnList.length > 0) ? 0 : -1;
      apnSelector.selectedIndex = iApn;
      this.selectedApnIndex_ = iApn;

      // Clear any user APN entry to inform Chrome to use the default APN.
      this.setActiveApn_({});

      updateHidden('.apn-list-view', false);
      updateHidden('.apn-details-view', true);
    },

    /**
     * Event Listener for the cellular-apn-set button.
     * @private
     */
    setApn_: function(apnValue) {
      if (apnValue == '')
        return;

      var apnSelector = $('select-apn');

      var activeApn = {};
      activeApn['AccessPointName'] = stringFromValue(apnValue);
      activeApn['Username'] = stringFromValue($('cellular-apn-username').value);
      activeApn['Password'] = stringFromValue($('cellular-apn-password').value);
      this.setActiveApn_(activeApn);
      // Set the user selected APN.
      this.userApn_ = activeApn;

      // Remove any existing 'user' entry.
      if (this.userApnIndex_ != -1) {
        assert(this.userApnIndex_ < apnSelector.length - 1);
        apnSelector.remove(this.userApnIndex_);
        this.userApnIndex_ = -1;
      }

      // Create a new 'user' entry with the new active apn.
      var option = document.createElement('option');
      option.textContent = activeApn['AccessPointName'];
      option.value = -1;
      option.selected = true;
      this.insertApnUserOption_(option);

      updateHidden('.apn-list-view', false);
      updateHidden('.apn-details-view', true);
    },

    /**
     * Event Listener for the cellular-apn-cancel button.
     * @private
     */
    cancelApn_: function() { this.initializeApnList_(); },

    /**
     * Event Listener for the select-apn button.
     * @private
     */
    selectApn_: function() {
      var onc = this.onc_;
      var apnSelector = $('select-apn');
      if (apnSelector[apnSelector.selectedIndex].value != -1) {
        var apnList = onc.getActiveValue('Cellular.APNList');
        var apnIndex = apnSelector.selectedIndex;
        assert(apnIndex < apnList.length);
        this.selectedApnIndex_ = apnIndex;
        this.setActiveApn_(apnList[apnIndex]);
      } else if (apnSelector.selectedIndex == this.userApnIndex_) {
        this.selectedApnIndex_ = apnSelector.selectedIndex;
        this.setActiveApn_(this.userApn_);
      } else { // 'Other'
        var apnDict;
        if (this.userApn_['AccessPointName']) {
          // Fill in the details fields with the existing 'user' config.
          apnDict = this.userApn_;
        } else {
          // No 'user' config, use the current values.
          apnDict = {};
          apnDict['AccessPointName'] =
              onc.getActiveValue('Cellular.APN.AccessPointName');
          apnDict['Username'] = onc.getActiveValue('Cellular.APN.Username');
          apnDict['Password'] = onc.getActiveValue('Cellular.APN.Password');
        }
        $('cellular-apn').value = stringFromValue(apnDict['AccessPointName']);
        $('cellular-apn-username').value = stringFromValue(apnDict['Username']);
        $('cellular-apn-password').value = stringFromValue(apnDict['Password']);
        updateHidden('.apn-list-view', true);
        updateHidden('.apn-details-view', false);
      }
    }
  };

  /**
   * Enables or Disables all buttons that provide operations on the cellular
   * network.
   */
  DetailsInternetPage.changeCellularButtonsState = function(disable) {
    var buttonsToDisableList =
        new Array('details-internet-login',
                  'details-internet-disconnect',
                  'details-internet-configure',
                  'activate-details',
                  'view-account-details');

    for (var i = 0; i < buttonsToDisableList.length; ++i) {
      var button = $(buttonsToDisableList[i]);
      button.disabled = disable;
    }
  };

  /**
   * If the network is not already activated, starts the activation process or
   * shows the activation UI. Otherwise does nothing.
   */
  DetailsInternetPage.activateCellular = function(guid) {
    chrome.networkingPrivate.getProperties(guid, function(properties) {
      var oncData = new OncData(properties);
      if (oncData.getActiveValue('Cellular.ActivationState') == 'Activated') {
        return;
      }
      var carrier = oncData.getActiveValue('Cellular.Carrier');
      if (carrier == CarrierSprint) {
        // Sprint is directly ativated, call startActivate().
        chrome.networkingPrivate.startActivate(guid, '');
      } else {
        chrome.send('showMorePlanInfo', [guid]);
      }
    });
  };

  /**
   * Performs minimal initialization of the InternetDetails dialog in
   * preparation for showing proxy-settings.
   */
  DetailsInternetPage.initializeProxySettings = function() {
    DetailsInternetPage.getInstance().initializePageContents_();
  };

  /**
   * Displays the InternetDetails dialog with only the proxy settings visible.
   */
  DetailsInternetPage.showProxySettings = function() {
    var detailsPage = DetailsInternetPage.getInstance();
    $('network-details-header').hidden = true;
    $('activate-details').hidden = true;
    $('view-account-details').hidden = true;
    $('web-proxy-auto-discovery').hidden = true;
    detailsPage.showProxy_ = true;
    updateHidden('#internet-tab', true);
    updateHidden('#details-tab-strip', true);
    updateHidden('#details-internet-page .action-area', true);
    detailsPage.updateControls();
    detailsPage.visible = true;
    sendChromeMetricsAction('Options_NetworkShowProxyTab');
  };

  /**
   * Initializes even handling for keyboard driven flow.
   */
  DetailsInternetPage.initializeKeyboardFlow = function() {
    keyboard.initializeKeyboardFlow();
  };

  DetailsInternetPage.updateProxySettings = function(type) {
      var proxyHost = null,
          proxyPort = null;

      if (type == 'cros.session.proxy.singlehttp') {
        proxyHost = 'proxy-host-single-name';
        proxyPort = 'proxy-host-single-port';
      } else if (type == 'cros.session.proxy.httpurl') {
        proxyHost = 'proxy-host-name';
        proxyPort = 'proxy-host-port';
      } else if (type == 'cros.session.proxy.httpsurl') {
        proxyHost = 'secure-proxy-host-name';
        proxyPort = 'secure-proxy-port';
      } else if (type == 'cros.session.proxy.ftpurl') {
        proxyHost = 'ftp-proxy';
        proxyPort = 'ftp-proxy-port';
      } else if (type == 'cros.session.proxy.socks') {
        proxyHost = 'socks-host';
        proxyPort = 'socks-port';
      } else {
        return;
      }

      var hostValue = $(proxyHost).value;
      if (hostValue.indexOf(':') !== -1) {
        if (hostValue.match(/:/g).length == 1) {
          hostValue = hostValue.split(':');
          $(proxyHost).value = hostValue[0];
          $(proxyPort).value = hostValue[1];
        }
      }
  };

  DetailsInternetPage.loginFromDetails = function() {
    DetailsInternetPage.configureOrConnect();
    PageManager.closeOverlay();
  };

  /**
   * This function identifies unconfigured networks and networks that are
   * likely to fail (e.g. due to a bad passphrase on a previous connect
   * attempt). For such networks a configure dialog will be opened. Otherwise
   * a connection will be attempted.
   */
  DetailsInternetPage.configureOrConnect = function() {
    var detailsPage = DetailsInternetPage.getInstance();
    if (detailsPage.type_ == 'WiFi')
      sendChromeMetricsAction('Options_NetworkConnectToWifi');
    else if (detailsPage.type_ == 'VPN')
      sendChromeMetricsAction('Options_NetworkConnectToVPN');

    var onc = detailsPage.onc_;
    var guid = onc.guid();
    var type = onc.getActiveValue('Type');

    // Built-in VPNs do not correctly set 'Connectable', so we always show the
    // configuration UI.
    if (type == 'VPN') {
      if (onc.getActiveValue('VPN.Type') != 'ThirdPartyVPN') {
        chrome.send('configureNetwork', [guid]);
        return;
      }
    }

    // If 'Connectable' is false for WiFi or WiMAX, Shill requires
    // additional configuration to connect, so show the configuration UI.
    if ((type == 'WiFi' || type == 'WiMAX') &&
        !onc.getActiveValue('Connectable')) {
      chrome.send('configureNetwork', [guid]);
      return;
    }

    // Secure WiFi networks with ErrorState set most likely require
    // configuration (e.g. a correct passphrase) before connecting.
    if (type == 'WiFi' && onc.getWiFiSecurity() != 'None') {
      var errorState = onc.getActiveValue('ErrorState');
      if (errorState && errorState != 'Unknown') {
        chrome.send('configureNetwork', [guid]);
        return;
      }
    }

    // Cellular networks need to be activated before they can be connected to.
    if (type == 'Cellular') {
      var activationState = onc.getActiveValue('Cellular.ActivationState');
      if (activationState != 'Activated' && activationState != 'Unknown') {
        DetailsInternetPage.activateCellular(guid);
        return;
      }
    }

    chrome.networkingPrivate.startConnect(guid);
  };

  DetailsInternetPage.disconnectNetwork = function() {
    var detailsPage = DetailsInternetPage.getInstance();
    if (detailsPage.type_ == 'WiFi')
      sendChromeMetricsAction('Options_NetworkDisconnectWifi');
    else if (detailsPage.type_ == 'VPN')
      sendChromeMetricsAction('Options_NetworkDisconnectVPN');
    chrome.networkingPrivate.startDisconnect(detailsPage.onc_.guid());
    PageManager.closeOverlay();
  };

  DetailsInternetPage.configureNetwork = function() {
    var detailsPage = DetailsInternetPage.getInstance();
    // This is an explicit request to show the configure dialog; do not show
    // the enrollment dialog for networks missing a certificate.
    var forceShow = true;
    chrome.send('configureNetwork', [detailsPage.onc_.guid(), forceShow]);
    PageManager.closeOverlay();
  };

  DetailsInternetPage.activateFromDetails = function() {
    var detailsPage = DetailsInternetPage.getInstance();
    if (detailsPage.type_ == 'Cellular')
      DetailsInternetPage.activateCellular(detailsPage.onc_.guid());
    PageManager.closeOverlay();
  };

  /**
   * Event handler called when the details page is closed. Sends changed
   * properties to Chrome and closes the overlay.
   */
  DetailsInternetPage.setDetails = function() {
    var detailsPage = DetailsInternetPage.getInstance();
    var type = detailsPage.type_;
    var oncData = new OncData({});
    var autoConnectCheckboxId = '';
    if (type == 'WiFi') {
      var preferredCheckbox =
          assertInstanceof($('prefer-network-wifi'), HTMLInputElement);
      if (!preferredCheckbox.hidden && !preferredCheckbox.disabled) {
        var kPreferredPriority = 1;
        var priority = preferredCheckbox.checked ? kPreferredPriority : 0;
        oncData.setProperty('Priority', priority);
        sendChromeMetricsAction('Options_NetworkSetPrefer');
      }
      autoConnectCheckboxId = 'auto-connect-network-wifi';
    } else if (type == 'WiMAX') {
      autoConnectCheckboxId = 'auto-connect-network-wimax';
    } else if (type == 'Cellular') {
      autoConnectCheckboxId = 'auto-connect-network-cellular';
    } else if (type == 'VPN') {
      var providerType = detailsPage.onc_.getActiveValue('VPN.Type');
      if (providerType != 'ThirdPartyVPN') {
        oncData.setProperty('VPN.Type', providerType);
        oncData.setProperty('VPN.Host', $('inet-server-hostname').value);
        autoConnectCheckboxId = 'auto-connect-network-vpn';
      }
    }
    if (autoConnectCheckboxId != '') {
      var autoConnectCheckbox =
          assertInstanceof($(autoConnectCheckboxId), HTMLInputElement);
      if (!autoConnectCheckbox.hidden && !autoConnectCheckbox.disabled) {
        var autoConnectKey = type + '.AutoConnect';
        oncData.setProperty(autoConnectKey, !!autoConnectCheckbox.checked);
        sendChromeMetricsAction('Options_NetworkAutoConnect');
      }
    }

    var nameServerTypes = ['automatic', 'google', 'user'];
    var nameServerType = 'automatic';
    for (var i = 0; i < nameServerTypes.length; ++i) {
      if ($(nameServerTypes[i] + '-dns-radio').checked) {
        nameServerType = nameServerTypes[i];
        break;
      }
    }
    var ipConfig = detailsPage.getIpConfig_(nameServerType);
    var ipAddressType = ('IPAddress' in ipConfig) ? 'Static' : 'DHCP';
    var nameServersType = ('NameServers' in ipConfig) ? 'Static' : 'DHCP';
    oncData.setProperty('IPAddressConfigType', ipAddressType);
    oncData.setProperty('NameServersConfigType', nameServersType);
    oncData.setProperty('StaticIPConfig', ipConfig);

    var data = oncData.getData();
    if (Object.keys(data).length > 0) {
      // TODO(stevenjb): Only set changed properties.
      chrome.networkingPrivate.setProperties(detailsPage.onc_.guid(), data);
    }

    PageManager.closeOverlay();
  };

  /**
   * Event handler called when the name server type changes.
   * @param {string} type The selected name sever type, 'automatic', 'google',
   *                      or 'user'.
   */
  DetailsInternetPage.updateNameServerDisplay = function(type) {
    var editable = type == 'user';
    var fields = [$('ipconfig-dns1'), $('ipconfig-dns2'),
                  $('ipconfig-dns3'), $('ipconfig-dns4')];
    for (var i = 0; i < fields.length; ++i) {
      fields[i].editable = editable;
    }
    if (editable)
      $('ipconfig-dns1').focus();

    var automaticDns = $('automatic-dns-display');
    var googleDns = $('google-dns-display');
    var userDns = $('user-dns-settings');
    switch (type) {
      case 'automatic':
        automaticDns.setAttribute('selected', '');
        googleDns.removeAttribute('selected');
        userDns.removeAttribute('selected');
        break;
      case 'google':
        automaticDns.removeAttribute('selected');
        googleDns.setAttribute('selected', '');
        userDns.removeAttribute('selected');
        break;
      case 'user':
        automaticDns.removeAttribute('selected');
        googleDns.removeAttribute('selected');
        userDns.setAttribute('selected', '');
        break;
    }
  };

  /**
   * Method called from Chrome when the ONC properties for the displayed
   * network may have changed.
   * @param {Object} oncData The updated ONC dictionary for the network.
   */
  DetailsInternetPage.updateConnectionData = function(oncData) {
    var detailsPage = DetailsInternetPage.getInstance();
    if (!detailsPage.visible)
      return;

    if (oncData.GUID != detailsPage.onc_.guid())
      return;

    // Update our cached data object.
    detailsPage.onc_ = new OncData(oncData);

    detailsPage.populateHeader_();
    detailsPage.updateConnectionButtonVisibility_();
    detailsPage.updateDetails_();
  };

  /**
   * Initializes the details page with the provided ONC data.
   * @param {Object} oncData Dictionary of ONC properties.
   */
  DetailsInternetPage.initializeDetailsPage = function(oncData) {
    var onc = new OncData(oncData);

    var detailsPage = DetailsInternetPage.getInstance();
    detailsPage.onc_ = onc;
    var type = onc.getActiveValue('Type');
    detailsPage.type_ = type;

    sendShowDetailsMetrics(type, onc.getActiveValue('ConnectionState'));

    detailsPage.populateHeader_();
    detailsPage.updateConnectionButtonVisibility_();
    detailsPage.updateDetails_();

    // TODO(stevenjb): Some of the setup below should be moved to
    // updateDetails_() so that updates are reflected in the UI.

    // Only show proxy for remembered networks.
    var remembered = onc.getSource() != 'None';
    if (remembered) {
      detailsPage.showProxy_ = true;
      // Inform Chrome which network to use for proxy configuration.
      chrome.send('selectNetwork', [detailsPage.onc_.guid()]);
    } else {
      detailsPage.showProxy_ = false;
    }

    $('web-proxy-auto-discovery').hidden = true;

    var restricted = onc.getActiveValue('RestrictedConnectivity');
    var restrictedString = loadTimeData.getString(
        restricted ? 'restrictedYes' : 'restrictedNo');

    // These objects contain an 'automatic' property that is displayed when
    // ip-automatic-configuration-checkbox is checked, and a 'value' property
    // that is displayed when unchecked and used to set the associated ONC
    // property for StaticIPConfig on commit.
    var inetAddress = {};
    var inetNetmask = {};
    var inetGateway = {};
    var ipv6Address = {};

    var inetNameServersString;

    var ipconfigList = onc.getActiveValue('IPConfigs');
    if (Array.isArray(ipconfigList)) {
      for (var i = 0; i < ipconfigList.length; ++i) {
        var ipconfig = ipconfigList[i];
        var ipType = ipconfig['Type'];
        var address = ipconfig['IPAddress'];
        if (ipType != 'IPv4') {
          if (ipType == 'IPv6' && !ipv6Address.value) {
            ipv6Address.automatic = address;
            ipv6Address.value = address;
          }
          continue;
        }
        if (inetAddress.value)
          continue;  // ipv4 address already provided.
        inetAddress.automatic = address;
        inetAddress.value = address;
        var netmask = prefixLengthToNetmask(ipconfig['RoutingPrefix']);
        inetNetmask.automatic = netmask;
        inetNetmask.value = netmask;
        var gateway = ipconfig['Gateway'];
        inetGateway.automatic = gateway;
        inetGateway.value = gateway;
        if ('WebProxyAutoDiscoveryUrl' in ipconfig) {
          $('web-proxy-auto-discovery').hidden = false;
          $('web-proxy-auto-discovery-url').value =
              ipconfig['WebProxyAutoDiscoveryUrl'];
        }
        if ('NameServers' in ipconfig) {
          var inetNameServers = ipconfig['NameServers'];
          inetNameServers = inetNameServers.sort();
          inetNameServersString = inetNameServers.join(',');
        }
      }
    }

    // Override the 'automatic' properties with the saved DHCP values if the
    // saved value is set, and set any unset 'value' properties.
    var savedNameServersString;
    var savedIpAddress = onc.getActiveValue('SavedIPConfig.IPAddress');
    if (savedIpAddress != undefined) {
      inetAddress.automatic = savedIpAddress;
      if (!inetAddress.value)
        inetAddress.value = savedIpAddress;
    }
    var savedPrefix = onc.getActiveValue('SavedIPConfig.RoutingPrefix');
    if (savedPrefix != undefined) {
      assert(typeof savedPrefix == 'number');
      var savedNetmask = prefixLengthToNetmask(
          /** @type {number} */(savedPrefix));
      inetNetmask.automatic = savedNetmask;
      if (!inetNetmask.value)
        inetNetmask.value = savedNetmask;
    }
    var savedGateway = onc.getActiveValue('SavedIPConfig.Gateway');
    if (savedGateway != undefined) {
      inetGateway.automatic = savedGateway;
      if (!inetGateway.value)
        inetGateway.value = savedGateway;
    }

    var savedNameServers = onc.getActiveValue('SavedIPConfig.NameServers');
    if (savedNameServers) {
      savedNameServers = savedNameServers.sort();
      savedNameServersString = savedNameServers.join(',');
    }

    var ipAutoConfig = 'automatic';
    if (onc.getActiveValue('IPAddressConfigType') == 'Static') {
      ipAutoConfig = 'user';
      var staticIpAddress = onc.getActiveValue('StaticIPConfig.IPAddress');
      inetAddress.user = staticIpAddress;
      inetAddress.value = staticIpAddress;

      var staticPrefix = onc.getActiveValue('StaticIPConfig.RoutingPrefix');
      if (typeof staticPrefix != 'number')
        staticPrefix = 0;
      var staticNetmask = prefixLengthToNetmask(
          /** @type {number} */ (staticPrefix));
      inetNetmask.user = staticNetmask;
      inetNetmask.value = staticNetmask;

      var staticGateway = onc.getActiveValue('StaticIPConfig.Gateway');
      inetGateway.user = staticGateway;
      inetGateway.value = staticGateway;
    }

    var staticNameServersString;
    if (onc.getActiveValue('NameServersConfigType') == 'Static') {
      var staticNameServers = onc.getActiveValue('StaticIPConfig.NameServers');
      staticNameServers = staticNameServers.sort();
      staticNameServersString = staticNameServers.join(',');
    }

    $('ip-automatic-configuration-checkbox').checked =
        ipAutoConfig == 'automatic';

    inetAddress.autoConfig = ipAutoConfig;
    inetNetmask.autoConfig = ipAutoConfig;
    inetGateway.autoConfig = ipAutoConfig;

    var configureAddressField = function(field, model) {
      IPAddressField.decorate(field);
      field.model = model;
      field.editable = model.autoConfig == 'user';
    };
    configureAddressField($('ip-address'), inetAddress);
    configureAddressField($('ipv6-address'), ipv6Address);
    configureAddressField($('ip-netmask'), inetNetmask);
    configureAddressField($('ip-gateway'), inetGateway);

    // Set Nameserver fields. Nameservers are 'automatic' by default. If a
    // static namerserver is set, use that unless it does not match a non
    // empty 'NameServers' value (indicating that the custom nameservers are
    // invalid or not being applied for some reason). TODO(stevenjb): Only
    // set these properites if they change so that invalid custom values do
    // not get lost.
    var nameServerType = 'automatic';
    if (staticNameServersString &&
        (!inetNameServersString ||
         staticNameServersString == inetNameServersString)) {
      if (staticNameServersString == GoogleNameServers.join(','))
        nameServerType = 'google';
      else
        nameServerType = 'user';
    }
    if (nameServerType == 'automatic')
      $('automatic-dns-display').textContent = inetNameServersString;
    else
      $('automatic-dns-display').textContent = savedNameServersString;
    $('google-dns-display').textContent = GoogleNameServers.join(',');

    var nameServersUser = [];
    if (staticNameServers) {
      nameServersUser = staticNameServers;
    } else if (savedNameServers) {
      // Pre-populate with values provided by DHCP server.
      nameServersUser = savedNameServers;
    }

    var nameServerModels = [];
    for (var i = 0; i < 4; ++i)
      nameServerModels.push({value: nameServersUser[i] || ''});

    $(nameServerType + '-dns-radio').checked = true;
    configureAddressField($('ipconfig-dns1'), nameServerModels[0]);
    configureAddressField($('ipconfig-dns2'), nameServerModels[1]);
    configureAddressField($('ipconfig-dns3'), nameServerModels[2]);
    configureAddressField($('ipconfig-dns4'), nameServerModels[3]);

    DetailsInternetPage.updateNameServerDisplay(nameServerType);

    var macAddress = onc.getActiveValue('MacAddress');
    if (macAddress) {
      $('hardware-address').textContent = macAddress;
      $('hardware-address-row').style.display = 'table-row';
    } else {
      // This is most likely a device without a hardware address.
      $('hardware-address-row').style.display = 'none';
    }

    var setOrHideParent = function(field, property) {
      if (property != undefined) {
        $(field).textContent = property;
        $(field).parentElement.hidden = false;
      } else {
        $(field).parentElement.hidden = true;
      }
    };

    var networkName = onc.getTranslatedValue('Name');

    // Signal strength as percentage (for WiFi and WiMAX).
    var signalStrength;
    if (type == 'WiFi' || type == 'WiMAX')
      signalStrength = onc.getActiveValue(type + '.SignalStrength');
    if (!signalStrength)
      signalStrength = 0;
    var strengthFormat = loadTimeData.getString('inetSignalStrengthFormat');
    var strengthString = strengthFormat.replace('$1', signalStrength);

    if (type == 'WiFi') {
      OptionsPage.showTab($('wifi-network-nav-tab'));
      $('wifi-restricted-connectivity').textContent = restrictedString;
      var ssid = onc.getActiveValue('WiFi.SSID');
      $('wifi-ssid').textContent = ssid ? ssid : networkName;
      setOrHideParent('wifi-bssid', onc.getActiveValue('WiFi.BSSID'));
      var security = onc.getWiFiSecurity();
      if (security == 'None')
        security = undefined;
      setOrHideParent('wifi-security', security);
      // Frequency is in MHz.
      var frequency = onc.getActiveValue('WiFi.Frequency');
      if (!frequency)
        frequency = 0;
      var frequencyFormat = loadTimeData.getString('inetFrequencyFormat');
      frequencyFormat = frequencyFormat.replace('$1', frequency);
      $('wifi-frequency').textContent = frequencyFormat;
      $('wifi-signal-strength').textContent = strengthString;
      setOrHideParent('wifi-hardware-address',
                      onc.getActiveValue('MacAddress'));
      var priority = onc.getActiveValue('Priority');
      $('prefer-network-wifi').checked = priority > 0;
      $('prefer-network-wifi').disabled = !remembered;
      $('auto-connect-network-wifi').checked =
          onc.getActiveValue('WiFi.AutoConnect');
      $('auto-connect-network-wifi').disabled = !remembered;
    } else if (type == 'WiMAX') {
      OptionsPage.showTab($('wimax-network-nav-tab'));
      $('wimax-restricted-connectivity').textContent = restrictedString;

      $('auto-connect-network-wimax').checked =
          onc.getActiveValue('WiMAX.AutoConnect');
      $('auto-connect-network-wimax').disabled = !remembered;
      var identity = onc.getActiveValue('WiMAX.EAP.Identity');
      setOrHideParent('wimax-eap-identity', identity);
      $('wimax-signal-strength').textContent = strengthString;
    } else if (type == 'Cellular') {
      OptionsPage.showTab($('cellular-conn-nav-tab'));

      var isGsm = onc.getActiveValue('Cellular.Family') == 'GSM';

      $('service-name').textContent = networkName;

      // TODO(stevenjb): Ideally many of these should be localized.
      $('network-technology').textContent =
          onc.getActiveValue('Cellular.NetworkTechnology');
      $('roaming-state').textContent =
          onc.getTranslatedValue('Cellular.RoamingState');
      $('cellular-restricted-connectivity').textContent = restrictedString;
      $('error-state').textContent = onc.getActiveValue('ErrorState');
      $('manufacturer').textContent =
          onc.getActiveValue('Cellular.Manufacturer');
      $('model-id').textContent = onc.getActiveValue('Cellular.ModelID');
      $('firmware-revision').textContent =
          onc.getActiveValue('Cellular.FirmwareRevision');
      $('hardware-revision').textContent =
          onc.getActiveValue('Cellular.HardwareRevision');
      $('mdn').textContent = onc.getActiveValue('Cellular.MDN');

      // Show ServingOperator properties only if available.
      var servingOperatorName =
          onc.getActiveValue('Cellular.ServingOperator.Name');
      var servingOperatorCode =
          onc.getActiveValue('Cellular.ServingOperator.Code');
      if (servingOperatorName != undefined &&
          servingOperatorCode != undefined) {
        $('operator-name').textContent = servingOperatorName;
        $('operator-code').textContent = servingOperatorCode;
      } else {
        $('operator-name').parentElement.hidden = true;
        $('operator-code').parentElement.hidden = true;
      }
      // Make sure that GSM/CDMA specific properties that shouldn't be hidden
      // are visible.
      updateHidden('#details-internet-page .gsm-only', false);
      updateHidden('#details-internet-page .cdma-only', false);

      // Show IMEI/ESN/MEID/MIN/PRL only if they are available.
      setOrHideParent('esn', onc.getActiveValue('Cellular.ESN'));
      setOrHideParent('imei', onc.getActiveValue('Cellular.IMEI'));
      setOrHideParent('meid', onc.getActiveValue('Cellular.MEID'));
      setOrHideParent('min', onc.getActiveValue('Cellular.MIN'));
      setOrHideParent('prl-version', onc.getActiveValue('Cellular.PRLVersion'));

      if (isGsm) {
        $('iccid').textContent = onc.getActiveValue('Cellular.ICCID');
        $('imsi').textContent = onc.getActiveValue('Cellular.IMSI');
        detailsPage.initializeApnList_();
      }
      $('auto-connect-network-cellular').checked =
          onc.getActiveValue('Cellular.AutoConnect');
      $('auto-connect-network-cellular').disabled = false;
    } else if (type == 'VPN') {
      OptionsPage.showTab($('vpn-nav-tab'));
      var providerType = onc.getActiveValue('VPN.Type');
      var isThirdPartyVPN = providerType == 'ThirdPartyVPN';
      $('vpn-tab').classList.toggle('third-party-vpn-provider',
                                    isThirdPartyVPN);

      $('inet-service-name').textContent = networkName;
      $('inet-provider-type').textContent =
          onc.getTranslatedValue('VPN.Type');

      if (isThirdPartyVPN) {
        $('inet-provider-name').textContent =
            onc.getActiveValue('VPN.ThirdPartyVPN.ProviderName');
      } else {
        var usernameKey;
        if (providerType == 'OpenVPN')
          usernameKey = 'VPN.OpenVPN.Username';
        else if (providerType == 'L2TP-IPsec')
          usernameKey = 'VPN.L2TP.Username';

        if (usernameKey) {
          $('inet-username').parentElement.hidden = false;
          $('inet-username').textContent = onc.getActiveValue(usernameKey);
        } else {
          $('inet-username').parentElement.hidden = true;
        }
        var inetServerHostname = $('inet-server-hostname');
        inetServerHostname.value = onc.getActiveValue('VPN.Host');
        inetServerHostname.resetHandler = function() {
          PageManager.hideBubble();
          var recommended = onc.getRecommendedValue('VPN.Host');
          if (recommended != undefined)
            inetServerHostname.value = recommended;
        };
        $('auto-connect-network-vpn').checked =
            onc.getActiveValue('VPN.AutoConnect');
        $('auto-connect-network-vpn').disabled = false;
      }
    } else {
      OptionsPage.showTab($('internet-nav-tab'));
    }

    // Update controlled option indicators.
    var indicators = cr.doc.querySelectorAll(
        '#details-internet-page .controlled-setting-indicator');
    for (var i = 0; i < indicators.length; i++) {
      var managed = indicators[i].hasAttribute('managed');
      // TODO(stevenjb): Eliminate support for 'data' once 39 is stable.
      var attributeName = managed ? 'managed' : 'data';
      var propName = indicators[i].getAttribute(attributeName);
      if (!propName)
        continue;
      var propValue = managed ?
          onc.getManagedProperty(propName) :
          onc.getActiveValue(propName);
      // If the property is unset or unmanaged (i.e. not an Object) skip it.
      if (propValue == undefined || (typeof propValue != 'object'))
        continue;
      var event;
      if (managed)
        event = detailsPage.createManagedEvent_(propName, propValue);
      else
        event = detailsPage.createControlledEvent_(propName,
            /** @type {{value: *, controlledBy: *, recommendedValue: *}} */(
                propValue));
      indicators[i].handlePrefChange(event);
      var forElement = $(indicators[i].getAttribute('internet-detail-for'));
      if (forElement) {
        if (event.value.controlledBy == 'policy')
          forElement.disabled = true;
        if (forElement.resetHandler)
          indicators[i].resetHandler = forElement.resetHandler;
      }
    }

    detailsPage.updateControls();

    // Don't show page name in address bar and in history to prevent people
    // navigate here by hand and solve issue with page session restore.
    PageManager.showPageByName('detailsInternetPage', false);
  };

  return {
    DetailsInternetPage: DetailsInternetPage
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Partial definition of the result of networkingPrivate.getProperties()).
 * TODO(stevenjb): Replace with chrome.networkingPrivate.NetworkStateProperties
 * once that is fully speced.
 * @typedef {{
 *   ConnectionState: string,
 *   Cellular: ?{
 *     Family: ?string,
 *     SIMPresent: ?boolean,
 *     SIMLockStatus: ?{ LockType: ?string },
 *     SupportNetworkScan: ?boolean
 *   },
 *   GUID: string,
 *   Name: string,
 *   Source: string,
 *   Type: string,
 *   VPN: ?{
 *     Type: string,
 *     ThirdPartyVPN: chrome.networkingPrivate.ThirdPartyVPNProperties
 *   }
 * }}
 * @see extensions/common/api/networking_private.idl
 */
var NetworkProperties;

/** @typedef {chrome.management.ExtensionInfo} */ var ExtensionInfo;

cr.define('options.network', function() {
  var ArrayDataModel = cr.ui.ArrayDataModel;
  var List = cr.ui.List;
  var ListItem = cr.ui.ListItem;
  var ListSingleSelectionModel = cr.ui.ListSingleSelectionModel;
  var Menu = cr.ui.Menu;
  var MenuItem = cr.ui.MenuItem;
  var ControlledSettingIndicator = options.ControlledSettingIndicator;

  /**
   * Network settings constants. These enums usually match their C++
   * counterparts.
   */
  function Constants() {}

  /**
   * Valid network type names.
   */
  Constants.NETWORK_TYPES = ['Ethernet', 'WiFi', 'WiMAX', 'Cellular', 'VPN'];

  /**
   * Helper function to check whether |type| is a valid network type.
   * @param {string} type A string that may contain a valid network type.
   * @return {boolean} Whether the string represents a valid network type.
   */
  function isNetworkType(type) {
    return (Constants.NETWORK_TYPES.indexOf(type) != -1);
  }

  /**
   * Order in which controls are to appear in the network list sorted by key.
   */
  Constants.NETWORK_ORDER = ['Ethernet',
                             'WiFi',
                             'WiMAX',
                             'Cellular',
                             'VPN',
                             'addConnection'];

  /**
   * ID of the menu that is currently visible.
   * @type {?string}
   * @private
   */
  var activeMenu_ = null;

  /**
   * The state of the cellular device or undefined if not available.
   * @type {?chrome.networkingPrivate.DeviceStateProperties}
   * @private
   */
  var cellularDevice_ = null;

  /**
   * The active cellular network or null if none.
   * @type {?NetworkProperties}
   * @private
   */
  var cellularNetwork_ = null;

  /**
   * The active ethernet network or null if none.
   * @type {?NetworkProperties}
   * @private
   */
  var ethernetNetwork_ = null;

  /**
   * The state of the WiFi device or undefined if not available.
   * @type {string|undefined}
   * @private
   */
  var wifiDeviceState_ = undefined;

  /**
   * The state of the WiMAX device or undefined if not available.
   * @type {string|undefined}
   * @private
   */
  var wimaxDeviceState_ = undefined;

  /**
   * The current list of third-party VPN providers.
   * @type {!Array<!chrome.networkingPrivate.ThirdPartyVPNProperties>}}
   * @private
   */
  var vpnProviders_ = [];

  /**
   * Indicates if mobile data roaming is enabled.
   * @type {boolean}
   * @private
   */
  var enableDataRoaming_ = false;

  /**
   * Returns the display name for 'network'.
   * @param {NetworkProperties} data The network data dictionary.
   */
  function getNetworkName(data) {
    if (data.Type == 'Ethernet')
      return loadTimeData.getString('ethernetName');
    var name = data.Name;
    if (data.Type == 'VPN' && data.VPN && data.VPN.Type == 'ThirdPartyVPN' &&
        data.VPN.ThirdPartyVPN) {
      var providerName = data.VPN.ThirdPartyVPN.ProviderName;
      if (providerName)
        return loadTimeData.getStringF('vpnNameTemplate', providerName, name);
    }
    return name;
  }

  /**
   * Create an element in the network list for controlling network
   * connectivity.
   * @param {Object} data Description of the network list or command.
   * @constructor
   * @extends {cr.ui.ListItem}
   */
  function NetworkListItem(data) {
    var el = cr.doc.createElement('li');
    el.data_ = {};
    for (var key in data)
      el.data_[key] = data[key];
    NetworkListItem.decorate(el);
    return el;
  }

  /**
   * @param {string} action An action to send to coreOptionsUserMetricsAction.
   */
  function sendChromeMetricsAction(action) {
    chrome.send('coreOptionsUserMetricsAction', [action]);
  }

  /**
   * @param {string} guid The network GUID.
   */
  function showDetails(guid) {
    chrome.networkingPrivate.getManagedProperties(
      guid, DetailsInternetPage.initializeDetailsPage);
  }

  /**
   * Decorate an element as a NetworkListItem.
   * @param {!Element} el The element to decorate.
   */
  NetworkListItem.decorate = function(el) {
    el.__proto__ = NetworkListItem.prototype;
    el.decorate();
  };

  NetworkListItem.prototype = {
    __proto__: ListItem.prototype,

    /**
     * Description of the network group or control.
     * @type {Object<Object>}
     * @private
     */
    data_: null,

    /**
     * Element for the control's subtitle.
     * @type {?Element}
     * @private
     */
    subtitle_: null,

    /**
     * Div containing the list item icon.
     * @type {?Element}
     * @private
     */
    iconDiv_: null,

    /**
     * Description of the network control.
     * @type {Object}
     */
    get data() {
      return this.data_;
    },

    /**
     * Text label for the subtitle.
     * @type {string}
     */
    set subtitle(text) {
      if (text)
        this.subtitle_.textContent = text;
      this.subtitle_.hidden = !text;
    },

    /**
     * Sets the icon based on a network state object.
     * @param {!NetworkProperties} data Network state properties.
     */
    set iconData(data) {
      if (!isNetworkType(data.Type))
        return;
      var networkIcon = this.getNetworkIcon();
      networkIcon.networkState =
          /** @type {chrome.networkingPrivate.NetworkStateProperties} */ (data);
    },

    /**
     * Sets the icon based on a network type or a special type indecator, e.g.
     * 'add-connection'
     * @type {string}
     */
    set iconType(type) {
      if (isNetworkType(type)) {
        var networkIcon = this.getNetworkIcon();
        networkIcon.networkType = type;
      } else {
        // Special cases. e.g. 'add-connection'. Background images are
        // defined in browser_options.css.
        var oldIcon = /** @type {CrNetworkIconElement} */ (
            this.iconDiv_.querySelector('cr-network-icon'));
        if (oldIcon)
          this.iconDiv_.removeChild(oldIcon);
        this.iconDiv_.classList.add('network-' + type.toLowerCase());
      }
    },

    /**
     * Returns any existing network icon for the list item or creates a new one.
     * @return {!CrNetworkIconElement} The network icon for the list item.
     */
    getNetworkIcon: function() {
      var networkIcon = /** @type {CrNetworkIconElement} */ (
          this.iconDiv_.querySelector('cr-network-icon'));
      if (!networkIcon) {
        networkIcon = /** @type {!CrNetworkIconElement} */ (
            document.createElement('cr-network-icon'));
        networkIcon.isListItem = false;
        this.iconDiv_.appendChild(networkIcon);
      }
      return networkIcon;
    },

    /**
     * Set the direction of the text.
     * @param {string} direction The direction of the text, e.g. 'ltr'.
     */
    setSubtitleDirection: function(direction) {
      this.subtitle_.dir = direction;
    },

    /**
     * Indicate that the selector arrow should be shown.
     */
    showSelector: function() {
      this.subtitle_.classList.add('network-selector');
    },

    /**
     * Adds an indicator to show that the network is policy managed.
     */
    showManagedNetworkIndicator: function() {
      this.appendChild(new ManagedNetworkIndicator());
    },

    /** @override */
    decorate: function() {
      ListItem.prototype.decorate.call(this);
      this.className = 'network-group';
      this.iconDiv_ = this.ownerDocument.createElement('div');
      this.iconDiv_.className = 'network-icon';
      this.appendChild(this.iconDiv_);
      var textContent = this.ownerDocument.createElement('div');
      textContent.className = 'network-group-labels';
      this.appendChild(textContent);
      var categoryLabel = this.ownerDocument.createElement('div');
      var title;
      if (this.data_.key == 'addConnection')
        title = 'addConnectionTitle';
      else
        title = this.data_.key.toLowerCase() + 'Title';
      categoryLabel.className = 'network-title';
      categoryLabel.textContent = loadTimeData.getString(title);
      textContent.appendChild(categoryLabel);
      this.subtitle_ = this.ownerDocument.createElement('div');
      this.subtitle_.className = 'network-subtitle';
      textContent.appendChild(this.subtitle_);
    },
  };

  /**
   * Creates a control that displays a popup menu when clicked.
   * @param {Object} data  Description of the control.
   * @constructor
   * @extends {NetworkListItem}
   */
  function NetworkMenuItem(data) {
    var el = new NetworkListItem(data);
    el.__proto__ = NetworkMenuItem.prototype;
    el.decorate();
    return el;
  }

  NetworkMenuItem.prototype = {
    __proto__: NetworkListItem.prototype,

    /**
     * Popup menu element.
     * @type {?Element}
     * @private
     */
    menu_: null,

    /** @override */
    decorate: function() {
      this.subtitle = null;
      if (this.data.iconType)
        this.iconType = this.data.iconType;
      this.addEventListener('click', (function() {
        this.showMenu();
      }).bind(this));
    },

    /**
     * Retrieves the ID for the menu.
     */
    getMenuName: function() {
      return this.data_.key.toLowerCase() + '-network-menu';
    },

    /**
     * Creates a popup menu for the control.
     * @return {Element} The newly created menu.
     */
    createMenu: function() {
      if (this.data.menu) {
        var menu = this.ownerDocument.createElement('div');
        menu.id = this.getMenuName();
        menu.className = 'network-menu';
        menu.hidden = true;
        Menu.decorate(menu);
        menu.menuItemSelector = '.network-menu-item';
        for (var i = 0; i < this.data.menu.length; i++) {
          var entry = this.data.menu[i];
          createCallback_(menu, null, entry.label, entry.command);
        }
        return menu;
      }
      return null;
    },

    /**
     * Determines if a menu can be updated on the fly. Menus that cannot be
     * updated are fully regenerated using createMenu. The advantage of
     * updating a menu is that it can preserve ordering of networks avoiding
     * entries from jumping around after an update.
     * @return {boolean} Whether the menu can be updated on the fly.
     */
    canUpdateMenu: function() {
      return false;
    },

    /**
     * Removes the current menu contents, causing it to be regenerated when the
     * menu is shown the next time. If the menu is showing right now, its
     * contents are regenerated immediately and the menu remains visible.
     */
    refreshMenu: function() {
      this.menu_ = null;
      if (activeMenu_ == this.getMenuName())
        this.showMenu();
    },

    /**
     * Displays a popup menu.
     */
    showMenu: function() {
      var rebuild = false;
      // Force a rescan if opening the menu for WiFi networks to ensure the
      // list is up to date. Networks are periodically rescanned, but depending
      // on timing, there could be an excessive delay before the first rescan
      // unless forced.
      var rescan = !activeMenu_ && this.data_.key == 'WiFi';
      if (!this.menu_) {
        rebuild = true;
        var existing = $(this.getMenuName());
        if (existing) {
          if (this.canUpdateMenu() && this.updateMenu())
            return;
          closeMenu_();
        }
        this.menu_ = this.createMenu();
        this.menu_.addEventListener('mousedown', function(e) {
          // Prevent blurring of list, which would close the menu.
          e.preventDefault();
        });
        var parent = $('network-menus');
        if (existing)
          parent.replaceChild(this.menu_, existing);
        else
          parent.appendChild(this.menu_);
      }
      var top = this.offsetTop + this.clientHeight;
      var menuId = this.getMenuName();
      if (menuId != activeMenu_ || rebuild) {
        closeMenu_();
        activeMenu_ = menuId;
        this.menu_.style.setProperty('top', top + 'px');
        this.menu_.hidden = false;
      }
      if (rescan) {
        chrome.networkingPrivate.requestNetworkScan();
      }
    }
  };

  /**
   * Creates a control for selecting or configuring a network connection based
   * on the type of connection (e.g. wifi versus vpn).
   * @param {{key: string, networkList: Array<!NetworkProperties>}} data
   *     An object containing the network type (key) and an array of networks.
   * @constructor
   * @extends {NetworkMenuItem}
   */
  function NetworkSelectorItem(data) {
    var el = new NetworkMenuItem(data);
    el.__proto__ = NetworkSelectorItem.prototype;
    el.decorate();
    return el;
  }

  /**
   * Returns true if |source| is a policy managed source.
   * @param {string} source The ONC source of a network.
   * @return {boolean} Whether |source| is a managed source.
   */
  function isManaged(source) {
    return (source == 'DevicePolicy' || source == 'UserPolicy');
  }

  /**
   * Returns true if |network| is visible.
   * @param {!chrome.networkingPrivate.NetworkStateProperties} network The
   *     network state properties.
   * @return {boolean} Whether |network| is visible.
   */
  function networkIsVisible(network) {
    if (network.Type == 'WiFi')
      return !!(network.WiFi && (network.WiFi.SignalStrength > 0));
    if (network.Type == 'WiMAX')
      return !!(network.WiMAX && (network.WiMAX.SignalStrength > 0));
    // Other network types are always considered 'visible'.
    return true;
  }

  /**
   * Returns true if |cellular| is a GSM network with no sim present.
   * @param {?chrome.networkingPrivate.DeviceStateProperties} cellularDevice
   * @return {boolean} Whether |network| is missing a SIM card.
   */
  function isCellularSimAbsent(cellularDevice) {
    return !!cellularDevice && cellularDevice.SimPresent === false;
  }

  /**
   * Returns true if |cellular| has a locked SIM card.
   * @param {?chrome.networkingPrivate.DeviceStateProperties} cellularDevice
   * @return {boolean} Whether |network| has a locked SIM card.
   */
  function isCellularSimLocked(cellularDevice) {
    return !!cellularDevice && !!cellularDevice.SimLockType;
  }

  NetworkSelectorItem.prototype = {
    __proto__: NetworkMenuItem.prototype,

    /** @override */
    decorate: function() {
      // TODO(kevers): Generalize method of setting default label.
      this.subtitle = loadTimeData.getString('OncConnectionStateNotConnected');
      var list = this.data_.networkList;
      var candidateData = null;
      for (var i = 0; i < list.length; i++) {
        var networkDetails = list[i];
        if (networkDetails.ConnectionState == 'Connecting' ||
            networkDetails.ConnectionState == 'Connected') {
          this.subtitle = getNetworkName(networkDetails);
          this.setSubtitleDirection('ltr');
          candidateData = networkDetails;
          // Only break when we see a connecting network as it is possible to
          // have a connected network and a connecting network at the same
          // time.
          if (networkDetails.ConnectionState == 'Connecting')
            break;
        }
      }
      if (candidateData)
        this.iconData = candidateData;
      else
        this.iconType = this.data.key;

      this.showSelector();

      if (candidateData && isManaged(candidateData.Source))
        this.showManagedNetworkIndicator();

      if (activeMenu_ == this.getMenuName()) {
        // Menu is already showing and needs to be updated. Explicitly calling
        // show menu will force the existing menu to be replaced.  The call
        // is deferred in order to ensure that position of this element has
        // beem properly updated.
        var self = this;
        setTimeout(function() {self.showMenu();}, 0);
      }
    },

    /**
     * Creates a menu for selecting, configuring or disconnecting from a
     * network.
     * @return {!Element} The newly created menu.
     */
    createMenu: function() {
      var menu = this.ownerDocument.createElement('div');
      menu.id = this.getMenuName();
      menu.className = 'network-menu';
      menu.hidden = true;
      Menu.decorate(menu);
      menu.menuItemSelector = '.network-menu-item';
      var addendum = [];
      if (this.data_.key == 'WiFi') {
        var item = {
          label: loadTimeData.getString('joinOtherNetwork'),
          data: {}
        };
        if (allowUnmanagedNetworks_()) {
          item.command = createAddNonVPNConnectionCallback_('WiFi');
        } else {
          item.command = null;
          item.tooltip = loadTimeData.getString('prohibitedNetworkOther');
        }
        addendum.push(item);
      } else if (this.data_.key == 'Cellular') {
        if (cellularDevice_.State == 'Enabled' &&
            cellularNetwork_ && cellularNetwork_.Cellular &&
            cellularNetwork_.Cellular.SupportNetworkScan) {
          addendum.push({
            label: loadTimeData.getString('otherCellularNetworks'),
            command: createAddNonVPNConnectionCallback_('Cellular'),
            addClass: ['other-cellulars'],
            data: {}
          });
        }

        var label = enableDataRoaming_ ? 'disableDataRoaming' :
            'enableDataRoaming';
        var disabled = !loadTimeData.getValue('loggedInAsOwner');
        var entry = {label: loadTimeData.getString(label),
                     data: {}};
        if (disabled) {
          entry.command = null;
          entry.tooltip =
              loadTimeData.getString('dataRoamingDisableToggleTooltip');
        } else {
          var self = this;
          entry.command = function() {
            options.Preferences.setBooleanPref(
                'cros.signed.data_roaming_enabled',
                !enableDataRoaming_, true);
            // Force revalidation of the menu the next time it is displayed.
            self.menu_ = null;
          };
        }
        addendum.push(entry);
      } else if (this.data_.key == 'VPN') {
        addendum = addendum.concat(createAddVPNConnectionEntries_());
      }

      var list = this.data.rememberedNetworks;
      if (list && list.length > 0) {
        var callback = function(list) {
          $('remembered-network-list').clear();
          var dialog = options.PreferredNetworks.getInstance();
          PageManager.showPageByName('preferredNetworksPage', false);
          dialog.update(list);
          sendChromeMetricsAction('Options_NetworkShowPreferred');
        };
        addendum.push({label: loadTimeData.getString('preferredNetworks'),
                       command: callback,
                       data: list});
      }

      var networkGroup = this.ownerDocument.createElement('div');
      networkGroup.className = 'network-menu-group';
      list = this.data.networkList;
      var empty = !list || list.length == 0;
      if (list) {
        var connectedVpnGuid = '';
        for (var i = 0; i < list.length; i++) {
          var data = list[i];
          this.createNetworkOptionsCallback_(networkGroup, data);
          // For VPN only, append a 'Disconnect' item to the dropdown menu.
          if (!connectedVpnGuid && data.Type == 'VPN' &&
              (data.ConnectionState == 'Connected' ||
               data.ConnectionState == 'Connecting')) {
            connectedVpnGuid = data.GUID;
          }
        }
        if (connectedVpnGuid) {
          var disconnectCallback = function() {
            sendChromeMetricsAction('Options_NetworkDisconnectVPN');
            chrome.networkingPrivate.startDisconnect(connectedVpnGuid);
          };
          // Add separator
          addendum.push({});
          addendum.push({label: loadTimeData.getString('disconnectNetwork'),
                         command: disconnectCallback,
                         data: data});
        }
      }
      if (this.data_.key == 'WiFi' || this.data_.key == 'WiMAX' ||
          this.data_.key == 'Cellular') {
        addendum.push({});
        if (this.data_.key == 'WiFi') {
          addendum.push({
            label: loadTimeData.getString('turnOffWifi'),
            command: function() {
              sendChromeMetricsAction('Options_NetworkWifiToggle');
              chrome.networkingPrivate.disableNetworkType(
                  chrome.networkingPrivate.NetworkType.WI_FI);
            },
            data: {}});
        } else if (this.data_.key == 'WiMAX') {
          addendum.push({
            label: loadTimeData.getString('turnOffWimax'),
            command: function() {
              chrome.networkingPrivate.disableNetworkType(
                  chrome.networkingPrivate.NetworkType.WI_MAX);
            },
            data: {}});
        } else if (this.data_.key == 'Cellular') {
          addendum.push({
            label: loadTimeData.getString('turnOffCellular'),
            command: function() {
              chrome.networkingPrivate.disableNetworkType(
                  chrome.networkingPrivate.NetworkType.CELLULAR);
            },
            data: {}});
        }
      }
      if (!empty)
        menu.appendChild(networkGroup);
      if (addendum.length > 0) {
        var separator = false;
        if (!empty) {
          menu.appendChild(MenuItem.createSeparator());
          separator = true;
        }
        for (var i = 0; i < addendum.length; i++) {
          var value = addendum[i];
          if (value.data) {
            var item = createCallback_(menu, value.data, value.label,
                                       value.command);
            if (value.tooltip)
              item.title = value.tooltip;
            if (value.addClass)
              item.classList.add(value.addClass);
            separator = false;
          } else if (!separator) {
            menu.appendChild(MenuItem.createSeparator());
            separator = true;
          }
        }
      }
      return menu;
    },

    /** @override */
    canUpdateMenu: function() {
      return this.data_.key == 'WiFi' && activeMenu_ == this.getMenuName();
    },

    /**
     * Updates an existing menu.  Updated menus preserve ordering of prior
     * entries.  During the update process, the ordering may differ from the
     * preferred ordering as determined by the network library.  If the
     * ordering becomes potentially out of sync, then the updated menu is
     * marked for disposal on close.  Reopening the menu will force a
     * regeneration, which will in turn fix the ordering. This method must only
     * be called if canUpdateMenu() returned |true|.
     * @return {boolean} True if successfully updated.
     */
    updateMenu: function() {
      var oldMenu = $(this.getMenuName());
      var group = oldMenu.getElementsByClassName('network-menu-group')[0];
      if (!group)
        return false;
      var newMenu = this.createMenu();
      var discardOnClose = false;
      var oldNetworkButtons = this.extractNetworkConnectButtons_(oldMenu);
      var newNetworkButtons = this.extractNetworkConnectButtons_(newMenu);
      for (var key in oldNetworkButtons) {
        if (newNetworkButtons[key]) {
          group.replaceChild(newNetworkButtons[key].button,
                             oldNetworkButtons[key].button);
          if (newNetworkButtons[key].index != oldNetworkButtons[key].index)
            discardOnClose = true;
          newNetworkButtons[key] = null;
        } else {
          // Leave item in list to prevent network items from jumping due to
          // deletions.
          oldNetworkButtons[key].disabled = true;
          discardOnClose = true;
        }
      }
      for (var key in newNetworkButtons) {
        var entry = newNetworkButtons[key];
        if (entry) {
          group.appendChild(entry.button);
          discardOnClose = true;
        }
      }
      oldMenu.data = {discardOnClose: discardOnClose};
      return true;
    },

    /**
     * Extracts a mapping of network names to menu element and position.
     * @param {!Element} menu The menu to process.
     * @return {Object<?{index: number, button: Element}>}
     *     Network mapping.
     * @private
     */
    extractNetworkConnectButtons_: function(menu) {
      var group = menu.getElementsByClassName('network-menu-group')[0];
      var networkButtons = {};
      if (!group)
        return networkButtons;
      var buttons = group.getElementsByClassName('network-menu-item');
      for (var i = 0; i < buttons.length; i++) {
        var label = buttons[i].data.label;
        networkButtons[label] = {index: i, button: buttons[i]};
      }
      return networkButtons;
    },

    /**
     * Adds a menu item for showing network details.
     * @param {!Element} parent The parent element.
     * @param {NetworkProperties} data Description of the network.
     * @private
     */
    createNetworkOptionsCallback_: function(parent, data) {
      var menuItem = null;
      if (data.Type == 'WiFi' && !allowUnmanagedNetworks_() &&
          !isManaged(data.Source)) {
        menuItem = createCallback_(parent,
                                   data,
                                   getNetworkName(data),
                                   null);
        menuItem.title = loadTimeData.getString('prohibitedNetwork');
      } else {
        menuItem = createCallback_(parent,
                                   data,
                                   getNetworkName(data),
                                   showDetails.bind(null, data.GUID));
      }
      if (isManaged(data.Source))
        menuItem.appendChild(new ManagedNetworkIndicator());
      if (data.ConnectionState == 'Connected' ||
          data.ConnectionState == 'Connecting') {
        var label = menuItem.getElementsByClassName(
            'network-menu-item-label')[0];
        label.classList.add('active-network');
      }
    }
  };

  /**
   * Creates a button-like control for configurating internet connectivity.
   * @param {{key: string, subtitle: string, command: Function}} data
   *     Description of the network control.
   * @constructor
   * @extends {NetworkListItem}
   */
  function NetworkButtonItem(data) {
    var el = new NetworkListItem(data);
    el.__proto__ = NetworkButtonItem.prototype;
    el.decorate();
    return el;
  }

  NetworkButtonItem.prototype = {
    __proto__: NetworkListItem.prototype,

    /** @override */
    decorate: function() {
      if (this.data.subtitle)
        this.subtitle = this.data.subtitle;
      else
       this.subtitle = null;
      if (this.data.command)
        this.addEventListener('click', this.data.command);
      if (this.data.iconData)
        this.iconData = this.data.iconData;
      else if (this.data.iconType)
        this.iconType = this.data.iconType;
      if (isManaged(this.data.Source))
        this.showManagedNetworkIndicator();
    },
  };

  /**
   * Adds a command to a menu for modifying network settings.
   * @param {!Element} menu Parent menu.
   * @param {?NetworkProperties} data Description of the network.
   * @param {!string} label Display name for the menu item.
   * @param {Function} command Callback function.
   * @return {!Element} The created menu item.
   * @private
   */
  function createCallback_(menu, data, label, command) {
    var button = menu.ownerDocument.createElement('div');
    button.className = 'network-menu-item';

    var buttonIconDiv = menu.ownerDocument.createElement('div');
    buttonIconDiv.className = 'network-icon';
    button.appendChild(buttonIconDiv);
    if (data && isNetworkType(data.Type)) {
      var networkIcon = /** @type {!CrNetworkIconElement} */ (
          document.createElement('cr-network-icon'));
      buttonIconDiv.appendChild(networkIcon);
      networkIcon.isListItem = true;
      networkIcon.networkState =
          /** @type {chrome.networkingPrivate.NetworkStateProperties} */ (data);
    }

    var buttonLabel = menu.ownerDocument.createElement('span');
    buttonLabel.className = 'network-menu-item-label';
    buttonLabel.textContent = label;
    button.appendChild(buttonLabel);
    var callback = null;
    if (command != null) {
      if (data) {
        callback = function() {
          (/** @type {Function} */(command))(data);
          closeMenu_();
        };
      } else {
        callback = function() {
          (/** @type {Function} */(command))();
          closeMenu_();
        };
      }
    }
    if (callback != null)
      button.addEventListener('activate', callback);
    else
      buttonLabel.classList.add('network-disabled-control');

    button.data = {label: label};
    MenuItem.decorate(button);
    menu.appendChild(button);
    return button;
  }

  /**
   * A list of controls for manipulating network connectivity.
   * @constructor
   * @extends {cr.ui.List}
   */
  var NetworkList = cr.ui.define('list');

  NetworkList.prototype = {
    __proto__: List.prototype,

    /** @override */
    decorate: function() {
      List.prototype.decorate.call(this);
      this.startBatchUpdates();
      this.autoExpands = true;
      this.dataModel = new ArrayDataModel([]);
      this.selectionModel = new ListSingleSelectionModel();
      this.addEventListener('blur', this.onBlur_.bind(this));
      this.selectionModel.addEventListener('change',
                                           this.onSelectionChange_.bind(this));

      // Wi-Fi control is always visible.
      this.update({key: 'WiFi', networkList: []});

      this.updateAddConnectionMenuEntries_();

      var prefs = options.Preferences.getInstance();
      prefs.addEventListener('cros.signed.data_roaming_enabled',
          function(event) {
            enableDataRoaming_ = event.value.value;
          });
      this.endBatchUpdates();

      this.onNetworkListChanged_();  // Trigger an initial network update

      chrome.networkingPrivate.onNetworkListChanged.addListener(
          this.onNetworkListChanged_.bind(this));
      chrome.networkingPrivate.onDeviceStateListChanged.addListener(
          this.onNetworkListChanged_.bind(this));

      chrome.management.onInstalled.addListener(
          this.onExtensionAdded_.bind(this));
      chrome.management.onEnabled.addListener(
          this.onExtensionAdded_.bind(this));
      chrome.management.onUninstalled.addListener(
          this.onExtensionRemoved_.bind(this));
      chrome.management.onDisabled.addListener(function(extension) {
        this.onExtensionRemoved_(extension.id);
      }.bind(this));

      chrome.management.getAll(this.onGetAllExtensions_.bind(this));
      chrome.networkingPrivate.requestNetworkScan();
    },

    /**
     * networkingPrivate event called when the network list has changed.
     */
    onNetworkListChanged_: function() {
      var networkList = this;
      chrome.networkingPrivate.getDeviceStates(function(deviceStates) {
        var filter = {
          networkType: chrome.networkingPrivate.NetworkType.ALL
        };
        chrome.networkingPrivate.getNetworks(filter, function(networkStates) {
          networkList.updateNetworkStates(deviceStates, networkStates);
        });
      });
    },

    /**
     * chrome.management.getAll callback.
     * @param {!Array<!ExtensionInfo>} extensions
     * @private
     */
    onGetAllExtensions_: function(extensions) {
      vpnProviders_ = [];
      for (var extension of extensions)
        this.addVpnProvider_(extension);
    },

    /**
     * If |extension| is a third-party VPN provider, add it to vpnProviders_.
     * @param {!ExtensionInfo} extension
     * @private
     */
    addVpnProvider_: function(extension) {
      if (!extension.enabled ||
          extension.permissions.indexOf('vpnProvider') == -1) {
        return;
      }
      // Ensure that we haven't already added this provider, e.g. if
      // the onExtensionAdded_ callback gets invoked after onGetAllExtensions_
      // for an extension in the returned list.
      for (var provider of vpnProviders_) {
        if (provider.ExtensionID == extension.id)
          return;
      }
      var newProvider = {
        ExtensionID: extension.id,
        ProviderName: extension.name
      };
      vpnProviders_.push(newProvider);
      this.refreshVpnProviders_();
    },

    /**
     * chrome.management.onInstalled or onEnabled event.
     * @param {!ExtensionInfo} extension
     * @private
     */
    onExtensionAdded_: function(extension) {
      this.addVpnProvider_(extension);
    },

    /**
     * chrome.management.onUninstalled or onDisabled event.
     * @param {string} extensionId
     * @private
     */
    onExtensionRemoved_: function(extensionId) {
      for (var i = 0; i < vpnProviders_.length; ++i) {
        var provider = vpnProviders_[i];
        if (provider.ExtensionID == extensionId) {
          vpnProviders_.splice(i, 1);
          this.refreshVpnProviders_();
          break;
        }
      }
    },

    /**
     * Rebuilds the list of VPN providers.
     * @private
     */
    refreshVpnProviders_: function() {
      // Refresh the contents of the VPN menu.
      var index = this.indexOf('VPN');
      if (index != undefined)
        this.getListItemByIndex(index).refreshMenu();

      // Refresh the contents of the "add connection" menu.
      this.updateAddConnectionMenuEntries_();
      index = this.indexOf('addConnection');
      if (index != undefined)
        this.getListItemByIndex(index).refreshMenu();
    },

    /**
     * Updates the entries in the "add connection" menu, based on the VPN
     * providers currently enabled in the user's profile.
     * @private
     */
    updateAddConnectionMenuEntries_: function() {
      var entries = [{
        label: loadTimeData.getString('addConnectionWifi'),
        command: createAddNonVPNConnectionCallback_('WiFi')
      }];
      entries = entries.concat(createAddVPNConnectionEntries_());
      this.update({key: 'addConnection',
                   iconType: 'add-connection',
                   menu: entries
                  });
    },

    /**
     * When the list loses focus, unselect all items in the list and close the
     * active menu.
     * @private
     */
    onBlur_: function() {
      this.selectionModel.unselectAll();
      closeMenu_();
    },

    /** @override */
    handleKeyDown: function(e) {
      if (activeMenu_) {
        // keyIdentifier does not report 'Esc' correctly
        if (e.keyCode == 27 /* Esc */) {
          closeMenu_();
          return;
        }

        if ($(activeMenu_).handleKeyDown(e)) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }

      if (e.keyIdentifier == 'Enter' ||
          e.keyIdentifier == 'U+0020' /* Space */) {
        var selectedListItem = this.getListItemByIndex(
            this.selectionModel.selectedIndex);
        if (selectedListItem) {
          selectedListItem.click();
          return;
        }
      }

      List.prototype.handleKeyDown.call(this, e);
    },

    /**
     * Close bubble and menu when a different list item is selected.
     * @param {Event} event Event detailing the selection change.
     * @private
     */
    onSelectionChange_: function(event) {
      PageManager.hideBubble();
      // A list item may temporarily become unselected while it is constructing
      // its menu. The menu should therefore only be closed if a different item
      // is selected, not when the menu's owner item is deselected.
      if (activeMenu_) {
        for (var i = 0; i < event.changes.length; ++i) {
          if (event.changes[i].selected) {
            var item = this.dataModel.item(event.changes[i].index);
            if (!item.getMenuName || item.getMenuName() != activeMenu_) {
              closeMenu_();
              return;
            }
          }
        }
      }
    },

    /**
     * Finds the index of a network item within the data model based on
     * category.
     * @param {string} key Unique key for the item in the list.
     * @return {(number|undefined)} The index of the network item, or
     *     |undefined| if it is not found.
     */
    indexOf: function(key) {
      var size = this.dataModel.length;
      for (var i = 0; i < size; i++) {
        var entry = this.dataModel.item(i);
        if (entry.key == key)
          return i;
      }
      return undefined;
    },

    /**
     * Updates a network control.
     * @param {Object} data Description of the entry.
     */
    update: function(data) {
      this.startBatchUpdates();
      var index = this.indexOf(data.key);
      if (index == undefined) {
        // Find reference position for adding the element.  We cannot hide
        // individual list elements, thus we need to conditionally add or
        // remove elements and cannot rely on any element having a fixed index.
        for (var i = 0; i < Constants.NETWORK_ORDER.length; i++) {
          if (data.key == Constants.NETWORK_ORDER[i]) {
            data.sortIndex = i;
            break;
          }
        }
        var referenceIndex = -1;
        for (var i = 0; i < this.dataModel.length; i++) {
          var entry = this.dataModel.item(i);
          if (entry.sortIndex < data.sortIndex)
            referenceIndex = i;
          else
            break;
        }
        if (referenceIndex == -1) {
          // Prepend to the start of the list.
          this.dataModel.splice(0, 0, data);
        } else if (referenceIndex == this.dataModel.length) {
          // Append to the end of the list.
          this.dataModel.push(data);
        } else {
          // Insert after the reference element.
          this.dataModel.splice(referenceIndex + 1, 0, data);
        }
      } else {
        var entry = this.dataModel.item(index);
        data.sortIndex = entry.sortIndex;
        this.dataModel.splice(index, 1, data);
      }
      this.endBatchUpdates();
    },

    /**
     * @override
     * @param {Object} entry
     */
    createItem: function(entry) {
      if (entry.networkList)
        return new NetworkSelectorItem(
            /** @type {{key: string, networkList: Array<!NetworkProperties>}} */
            (entry));
      if (entry.command)
        return new NetworkButtonItem(
            /** @type {{key: string, subtitle: string, command: Function}} */(
                entry));
      if (entry.menu)
        return new NetworkMenuItem(entry);
      assertNotReached();
    },

    /**
     * Deletes an element from the list.
     * @param {string} key  Unique identifier for the element.
     */
    deleteItem: function(key) {
      var index = this.indexOf(key);
      if (index != undefined)
        this.dataModel.splice(index, 1);
    },

    /**
     * Updates the state of network devices and services.
     * @param {!Array<!chrome.networkingPrivate.DeviceStateProperties>}
     *     deviceStates The result from networkingPrivate.getDeviceStates.
     * @param {!Array<!chrome.networkingPrivate.NetworkStateProperties>}
     *     networkStates The result from networkingPrivate.getNetworks.
     */
    updateNetworkStates: function(deviceStates, networkStates) {
      // Update device states.
      cellularDevice_ = null;
      wifiDeviceState_ = undefined;
      wimaxDeviceState_ = undefined;
      for (var i = 0; i < deviceStates.length; ++i) {
        var device = deviceStates[i];
        var type = device.Type;
        var state = device.State;
        if (type == 'Cellular')
          cellularDevice_ = cellularDevice_ || device;
        else if (type == 'WiFi')
          wifiDeviceState_ = wifiDeviceState_ || state;
        else if (type == 'WiMAX')
          wimaxDeviceState_ = wimaxDeviceState_ || state;
      }

      // Update active network states.
      cellularNetwork_ = null;
      ethernetNetwork_ = null;
      for (var i = 0; i < networkStates.length; i++) {
        // Note: This cast is valid since
        // networkingPrivate.NetworkStateProperties is a subset of
        // NetworkProperties and all missing properties are optional.
        var entry = /** @type {NetworkProperties} */ (networkStates[i]);
        switch (entry.Type) {
          case 'Cellular':
            cellularNetwork_ = cellularNetwork_ || entry;
            break;
          case 'Ethernet':
            // Ignore any EAP Parameters networks (which lack ConnectionState).
            if (entry.ConnectionState)
              ethernetNetwork_ = ethernetNetwork_ || entry;
            break;
        }
        if (cellularNetwork_ && ethernetNetwork_)
          break;
      }

      if (cellularNetwork_ && cellularNetwork_.GUID) {
        // Get the complete set of cellular properties which includes SIM and
        // Scan properties.
        var networkList = this;
        chrome.networkingPrivate.getProperties(
            cellularNetwork_.GUID, function(cellular) {
              cellularNetwork_ = /** @type {NetworkProperties} */ (cellular);
              networkList.updateControls(networkStates);
            });
      } else {
        this.updateControls(networkStates);
      }
    },

    /**
     * Updates network controls.
     * @param {!Array<!chrome.networkingPrivate.NetworkStateProperties>}
     *     networkStates The result from networkingPrivate.getNetworks.
     */
    updateControls: function(networkStates) {
      this.startBatchUpdates();

      // Only show Ethernet control if available.
      if (ethernetNetwork_) {
        var ethernetOptions = showDetails.bind(null, ethernetNetwork_.GUID);
        var state = ethernetNetwork_.ConnectionState;
        var subtitle;
        if (state == 'Connected')
          subtitle = loadTimeData.getString('OncConnectionStateConnected');
        else if (state == 'Connecting')
          subtitle = loadTimeData.getString('OncConnectionStateConnecting');
        else
          subtitle = loadTimeData.getString('OncConnectionStateNotConnected');
        this.update(
          { key: 'Ethernet',
            subtitle: subtitle,
            iconData: ethernetNetwork_,
            command: ethernetOptions,
            Source: ethernetNetwork_.Source }
        );
      } else {
        this.deleteItem('Ethernet');
      }

      if (wifiDeviceState_ == 'Enabled')
        loadData_('WiFi', networkStates);
      else if (wifiDeviceState_ ==
          chrome.networkingPrivate.DeviceStateType.PROHIBITED)
        setTechnologiesProhibited_(chrome.networkingPrivate.NetworkType.WI_FI);
      else
        addEnableNetworkButton_(chrome.networkingPrivate.NetworkType.WI_FI);

      // Only show cellular control if available.
      if (cellularDevice_) {
        if (cellularDevice_.State == 'Enabled' &&
            !isCellularSimAbsent(cellularDevice_) &&
            !isCellularSimLocked(cellularDevice_)) {
          loadData_('Cellular', networkStates);
        } else if (cellularDevice_.State ==
            chrome.networkingPrivate.DeviceStateType.PROHIBITED) {
          setTechnologiesProhibited_(
              chrome.networkingPrivate.NetworkType.CELLULAR);
        } else {
          addEnableNetworkButton_(
              chrome.networkingPrivate.NetworkType.CELLULAR);
        }
      } else {
        this.deleteItem('Cellular');
      }

      // Only show wimax control if available. Uses cellular icons.
      if (wimaxDeviceState_) {
        if (wimaxDeviceState_ == 'Enabled') {
          loadData_('WiMAX', networkStates);
        } else if (wimaxDeviceState_ ==
            chrome.networkingPrivate.DeviceStateType.PROHIBITED) {
          setTechnologiesProhibited_(
              chrome.networkingPrivate.NetworkType.WI_MAX);
        } else {
          addEnableNetworkButton_(chrome.networkingPrivate.NetworkType.WI_MAX);
        }
      } else {
        this.deleteItem('WiMAX');
      }

      // Only show VPN control if there is at least one VPN configured.
      if (loadData_('VPN', networkStates) == 0)
        this.deleteItem('VPN');

      this.endBatchUpdates();
    }
  };

  /**
   * Replaces a network menu with a button for enabling the network type.
   * @param {chrome.networkingPrivate.NetworkType} type
   * @private
   */
  function addEnableNetworkButton_(type) {
    var subtitle = loadTimeData.getString('networkDisabled');
    var enableNetwork = function() {
      if (type == chrome.networkingPrivate.NetworkType.WI_FI)
        sendChromeMetricsAction('Options_NetworkWifiToggle');
      if (type == chrome.networkingPrivate.NetworkType.CELLULAR) {
        if (isCellularSimLocked(cellularDevice_)) {
          chrome.send('simOperation', ['unlock']);
          return;
        } else if (isCellularSimAbsent(cellularDevice_)) {
          chrome.send('simOperation', ['configure']);
          return;
        }
      }
      chrome.networkingPrivate.enableNetworkType(type);
    };
    $('network-list').update({key: type,
                              subtitle: subtitle,
                              iconType: type,
                              command: enableNetwork});
  }

  /**
   * Replaces a network menu with a button with nothing to do.
   * @param {!chrome.networkingPrivate.NetworkType} type
   * @private
   */
  function setTechnologiesProhibited_(type) {
    var subtitle = loadTimeData.getString('networkProhibited');
    var doNothingButRemoveClickShadow = function() {
      this.removeAttribute('lead');
      this.removeAttribute('selected');
      this.parentNode.removeAttribute('has-element-focus');
    };
    $('network-list').update({key: type,
                              subtitle: subtitle,
                              iconType: type,
                              command: doNothingButRemoveClickShadow});
  }

  /**
   * Element for indicating a policy managed network.
   * @constructor
   * @extends {options.ControlledSettingIndicator}
   */
  function ManagedNetworkIndicator() {
    var el = cr.doc.createElement('span');
    el.__proto__ = ManagedNetworkIndicator.prototype;
    el.decorate();
    return el;
  }

  ManagedNetworkIndicator.prototype = {
    __proto__: ControlledSettingIndicator.prototype,

    /** @override */
    decorate: function() {
      ControlledSettingIndicator.prototype.decorate.call(this);
      this.controlledBy = 'policy';
      var policyLabel = loadTimeData.getString('managedNetwork');
      this.setAttribute('textPolicy', policyLabel);
      this.removeAttribute('tabindex');
    },

    /** @override */
    handleEvent: function(event) {
      // Prevent focus blurring as that would close any currently open menu.
      if (event.type == 'mousedown')
        return;
      ControlledSettingIndicator.prototype.handleEvent.call(this, event);
    },

    /**
     * Handle mouse events received by the bubble, preventing focus blurring as
     * that would close any currently open menu and preventing propagation to
     * any elements located behind the bubble.
     * @param {Event} event Mouse event.
     */
    stopEvent: function(event) {
      event.preventDefault();
      event.stopPropagation();
    },

    /** @override */
    toggleBubble: function() {
      if (activeMenu_ && !$(activeMenu_).contains(this))
        closeMenu_();
      ControlledSettingIndicator.prototype.toggleBubble.call(this);
      if (this.showingBubble) {
        var bubble = PageManager.getVisibleBubble();
        bubble.addEventListener('mousedown', this.stopEvent);
        bubble.addEventListener('click', this.stopEvent);
      }
    }
  };

  /**
   * Updates the list of available networks and their status, filtered by
   * network type.
   * @param {string} type The type of network.
   * @param {Array<!chrome.networkingPrivate.NetworkStateProperties>} networks
   *     The list of network objects.
   * @return {number} The number of visible networks matching |type|.
   */
  function loadData_(type, networks) {
    var res = 0;
    var availableNetworks = [];
    var rememberedNetworks = [];
    for (var i = 0; i < networks.length; i++) {
      var network = networks[i];
      if (network.Type != type)
        continue;
      if (networkIsVisible(network)) {
        availableNetworks.push(network);
        ++res;
      }
      if ((type == 'WiFi' || type == 'VPN') && network.Source &&
          network.Source != 'None') {
        rememberedNetworks.push(network);
      }
    }
    var data = {
      key: type,
      networkList: availableNetworks,
      rememberedNetworks: rememberedNetworks
    };
    $('network-list').update(data);
    return res;
  }

  /**
   * Hides the currently visible menu.
   * @private
   */
  function closeMenu_() {
    if (activeMenu_) {
      var menu = $(activeMenu_);
      menu.hidden = true;
      if (menu.data && menu.data.discardOnClose)
        menu.parentNode.removeChild(menu);
      activeMenu_ = null;
    }
  }

  /**
   * Creates a callback function that adds a new connection of the given type.
   * This method may be used for all network types except VPN.
   * @param {string} type An ONC network type
   * @return {function()} The created callback.
   * @private
   */
  function createAddNonVPNConnectionCallback_(type) {
    return function() {
      if (type == 'WiFi')
        sendChromeMetricsAction('Options_NetworkJoinOtherWifi');
      chrome.send('addNonVPNConnection', [type]);
    };
  }

  /**
   * Creates a callback function that shows the "add network" dialog for a VPN
   * provider. If |opt_extensionID| is omitted, the dialog for the built-in
   * OpenVPN/L2TP provider is shown. Otherwise, |opt_extensionID| identifies the
   * third-party provider for which the dialog should be shown.
   * @param {string=} opt_extensionID Extension ID identifying the third-party
   *     VPN provider for which the dialog should be shown.
   * @return {function()} The created callback.
   * @private
   */
  function createVPNConnectionCallback_(opt_extensionID) {
    return function() {
      sendChromeMetricsAction(opt_extensionID ?
          'Options_NetworkAddVPNThirdParty' :
          'Options_NetworkAddVPNBuiltIn');
      chrome.send('addVPNConnection',
                  opt_extensionID ? [opt_extensionID] : undefined);
    };
  }

  /**
   * Generates an "add network" entry for each VPN provider currently enabled in
   * the user's profile.
   * @return {!Array<{label: string, command: function(), data: !Object}>} The
   *     list of entries.
   * @private
   */
  function createAddVPNConnectionEntries_() {
    var entries = [];
    for (var i = 0; i < vpnProviders_.length; ++i) {
      var provider = vpnProviders_[i];
      entries.push({
        label: loadTimeData.getStringF('addConnectionVPNTemplate',
                                       provider.ProviderName),
        command: createVPNConnectionCallback_(provider.ExtensionID),
        data: {}
      });
    }
    // Add an entry for the built-in OpenVPN/L2TP provider.
    entries.push({
      label: loadTimeData.getString('vpnBuiltInProvider'),
      command: createVPNConnectionCallback_(),
      data: {}
    });
    return entries;
  }

  /**
   * Return whether connecting to or viewing unmanaged networks is allowed.
   * @private
   */
  function allowUnmanagedNetworks_() {
    if (loadTimeData.valueExists('allowOnlyPolicyNetworksToConnect') &&
        loadTimeData.getBoolean('allowOnlyPolicyNetworksToConnect')) {
      return false;
    }
    return true;
  }

  /**
   * Whether the Network list is disabled. Only used for display purpose.
   */
  cr.defineProperty(NetworkList, 'disabled', cr.PropertyKind.BOOL_ATTR);

  // Export
  return {
    NetworkList: NetworkList
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.exportPath('options');

/**
 * @typedef {{GUID: string, Name: string, Source: string, Type: string}}
 */
options.PreferredNetwork;

cr.define('options', function() {

  var Page = cr.ui.pageManager.Page;
  var PageManager = cr.ui.pageManager.PageManager;
  var ArrayDataModel = cr.ui.ArrayDataModel;
  var DeletableItem = options.DeletableItem;
  var DeletableItemList = options.DeletableItemList;

  /////////////////////////////////////////////////////////////////////////////
  // NetworkPreferences class:

  /**
   * Encapsulated handling of ChromeOS network preferences page.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function PreferredNetworks(model) {
    Page.call(this, 'preferredNetworksPage', '', 'preferredNetworksPage');
  }

  cr.addSingletonGetter(PreferredNetworks);

  PreferredNetworks.prototype = {
    __proto__: Page.prototype,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);
      PreferredNetworkList.decorate($('remembered-network-list'));
      $('preferred-networks-confirm').onclick =
          PageManager.closeOverlay.bind(PageManager);
    },

    update: function(rememberedNetworks) {
      var list = $('remembered-network-list');
      list.clear();
      for (var i = 0; i < rememberedNetworks.length; i++) {
        list.append(rememberedNetworks[i]);
      }
      list.redraw();
    }

  };

  /**
   * Creates a list entry for a remembered network.
   * @param {options.PreferredNetwork} data Description of the network.
   * @constructor
   * @extends {options.DeletableItem}
   */
  function PreferredNetworkListItem(data) {
    var el = cr.doc.createElement('div');
    el.__proto__ = PreferredNetworkListItem.prototype;
    el.data = {};
    for (var key in data)
      el.data[key] = data[key];
    el.decorate();
    return el;
  }

  PreferredNetworkListItem.prototype = {
    __proto__: DeletableItem.prototype,

    /**
     * Description of the network.
     * @type {?options.PreferredNetwork}
     */
    data: null,

    /** @override */
    decorate: function() {
      DeletableItem.prototype.decorate.call(this);
      var label = this.ownerDocument.createElement('div');
      label.textContent = this.data.Name;
      if (this.data.Source == 'DevicePolicy' ||
          this.data.Source == 'UserPolicy') {
        this.deletable = false;
      }
      this.contentElement.appendChild(label);
    }
  };

  /**
   * Class for displaying a list of preferred networks.
   * @constructor
   * @extends {options.DeletableItemList}
   */
  var PreferredNetworkList = cr.ui.define('list');

  PreferredNetworkList.prototype = {
    __proto__: DeletableItemList.prototype,

    /** @override */
    decorate: function() {
      DeletableItemList.prototype.decorate.call(this);
      this.addEventListener('blur', this.onBlur_);
      this.clear();
    },

    /**
     * When the list loses focus, unselect all items in the list.
     * @private
     */
    onBlur_: function() {
      this.selectionModel.unselectAll();
    },

    /**
     * @override
     * @param {options.PreferredNetwork} entry
     */
    createItem: function(entry) {
      return new PreferredNetworkListItem(entry);
    },

    /** @override */
    deleteItemAtIndex: function(index) {
      var item = this.dataModel.item(index);
      if (item)
        chrome.networkingPrivate.forgetNetwork(item.GUID);
      this.dataModel.splice(index, 1);
      // Invalidate the list since it has a stale cache after a splice
      // involving a deletion.
      this.invalidate();
      this.redraw();
    },

    /**
     * Purges all networks from the list.
     */
    clear: function() {
      this.dataModel = new ArrayDataModel([]);
      this.redraw();
    },

    /**
     * Adds a remembered network to the list.
     * @param {options.PreferredNetwork} data Description of the network.
     */
    append: function(data) {
      this.dataModel.push(data);
    }
  };

  // Export
  return {
    PreferredNetworks: PreferredNetworks
  };

});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options.system.bluetooth', function() {
  /** @const */ var ArrayDataModel = cr.ui.ArrayDataModel;
  /** @const */ var DeletableItem = options.DeletableItem;
  /** @const */ var DeletableItemList = options.DeletableItemList;
  /** @const */ var ListSingleSelectionModel = cr.ui.ListSingleSelectionModel;

  /**
   * Bluetooth settings constants.
   */
  function Constants() {}

  /**
   * Creates a new bluetooth list item.
   * @param {chrome.bluetooth.Device} device
   * @constructor
   * @extends {options.DeletableItem}
   */
  function BluetoothListItem(device) {
    var el = cr.doc.createElement('div');
    el.__proto__ = BluetoothListItem.prototype;
    el.data = {};
    for (var key in device)
      el.data[key] = device[key];
    el.decorate();
    // Only show the close button for paired devices, but not for connecting
    // devices.
    el.deletable = device.paired && !device.connecting;
    return el;
  }

  BluetoothListItem.prototype = {
    __proto__: DeletableItem.prototype,

    /**
     * Description of the Bluetooth device.
     * @type {?chrome.bluetooth.Device}
     */
    data: null,

    /** @override */
    decorate: function() {
      DeletableItem.prototype.decorate.call(this);
      var label = this.ownerDocument.createElement('div');
      label.className = 'bluetooth-device-label';
      this.classList.add('bluetooth-device');

      var connecting = !!this.data.connecting;
      var connected = !!this.data.connected;
      var connectable = !!this.data.connectable;
      var paired = !!this.data.paired;

      // There are four kinds of devices we want to distinguish:
      //  * Connecting devices: in bold with a "connecting" label,
      //  * Connected devices: in bold,
      //  * Paired, not connected but connectable devices: regular and
      //  * Paired, not connected and not connectable devices: grayed out.
      this.connected = connecting || (paired && connected);
      this.notconnectable = paired && !connecting &&
          !connected && !connectable;
      // "paired" devices are those that are remembered but not connected.
      this.paired = paired && !connected && connectable;

      var content = this.data.name;
      // Update the device's label according to its state. A "connecting" device
      // can be in the process of connecting and pairing, so we check connecting
      // first.
      if (connecting) {
        content = loadTimeData.getStringF('bluetoothDeviceConnecting',
            this.data.name);
      }
      label.textContent = content;
      this.contentElement.appendChild(label);
    },
  };

  /**
   * Class for displaying a list of Bluetooth devices.
   * @constructor
   * @extends {options.DeletableItemList}
   */
  var BluetoothDeviceList = cr.ui.define('list');

  BluetoothDeviceList.prototype = {
    __proto__: DeletableItemList.prototype,

    /**
     * Height of a list entry in px.
     * @type {number}
     * @private
     */
    itemHeight_: 32,

    /**
     * Width of a list entry in px.
     * @type {number}
     * @private
     */
    itemWidth_: 400,

    /** @override */
    decorate: function() {
      DeletableItemList.prototype.decorate.call(this);
      // Force layout of all items even if not in the viewport to address
      // errors in scroll positioning when the list is hidden during initial
      // layout. The impact on performance should be minimal given that the
      // list is not expected to grow very large. Fixed height items are also
      // required to avoid caching incorrect sizes during layout of a hidden
      // list.
      this.autoExpands = true;
      this.fixedHeight = true;
      this.clear();
      this.selectionModel = new ListSingleSelectionModel();
    },

    /**
     * Adds a bluetooth device to the list of available devices. A check is
     * made to see if the device is already in the list, in which case the
     * existing device is updated.
     * @param {!chrome.bluetooth.Device} device
     * @return {boolean} True if the devies was successfully added or updated.
     */
    appendDevice: function(device) {
      var selectedDevice = this.getSelectedDevice_();
      var index = this.find(device.address);
      if (index == undefined) {
        this.dataModel.push(device);
        this.redraw();
      } else {
        this.dataModel.splice(index, 1, device);
        this.redrawItem(index);
      }
      this.updateListVisibility_();
      if (selectedDevice)
        this.setSelectedDevice_(selectedDevice);
      return true;
    },

    /**
     * Forces a revailidation of the list content. Deleting a single item from
     * the list results in a stale cache requiring an invalidation.
     * @param {string=} opt_selection Optional address of device to select
     *     after refreshing the list.
     */
    refresh: function(opt_selection) {
      // TODO(kevers): Investigate if the stale cache issue can be fixed in
      // cr.ui.list.
      var selectedDevice = opt_selection ? opt_selection :
          this.getSelectedDevice_();
      this.invalidate();
      this.redraw();
      if (selectedDevice)
        this.setSelectedDevice_(selectedDevice);
    },

    /**
     * Retrieves the address of the selected device, or null if no device is
     * selected.
     * @return {(string|undefined)} Address of selected device or null.
     * @private
     */
    getSelectedDevice_: function() {
      var selection = this.selectedItem;
      if (selection)
        return selection.address;
      return undefined;
    },

    /**
     * Selects the device with the matching address.
     * @param {string} address The unique address of the device.
     * @private
     */
    setSelectedDevice_: function(address) {
      var index = this.find(address);
      if (index != undefined)
        this.selectionModel.selectRange(index, index);
    },

    /**
     * Perges all devices from the list.
     */
    clear: function() {
      this.dataModel = new ArrayDataModel([]);
      this.redraw();
      this.updateListVisibility_();
    },

    /**
     * Returns the index of the list entry with the matching address.
     * @param {string} address Unique address of the Bluetooth device.
     * @return {number|undefined} Index of the matching entry or
     * undefined if no match found.
     */
    find: function(address) {
      var size = this.dataModel.length;
      for (var i = 0; i < size; i++) {
        var entry = this.dataModel.item(i);
        if (entry.address == address)
          return i;
      }
      return undefined;
    },

    /**
     * @override
     * @param {chrome.bluetooth.Device} entry
     */
    createItem: function(entry) {
      return new BluetoothListItem(entry);
    },

    /**
     * Overrides the default implementation, which is used to compute the
     * size of an element in the list.  The default implementation relies
     * on adding a placeholder item to the list and fetching its size and
     * position. This strategy does not work if an item is added to the list
     * while it is hidden, as the computed metrics will all be zero in that
     * case.
     * @return {{height: number, marginTop: number, marginBottom: number,
     *     width: number, marginLeft: number, marginRight: number}}
     *     The height and width of the item, taking margins into account,
     *     and the margins themselves.
     */
    measureItem: function() {
      return {
        height: this.itemHeight_,
        marginTop: 0,
        marginBottom: 0,
        width: this.itemWidth_,
        marginLeft: 0,
        marginRight: 0
      };
    },

    /**
     * Override the default implementation to return a predetermined size,
     * which in turns allows proper layout of items even if the list is hidden.
     * @return {{height: number, width: number}} Dimensions of a single item in
     *     the list of bluetooth device.
     * @private
     */
    getDefaultItemSize_: function() {
      return {
        height: this.itemHeight_,
        width: this.itemWidth_
      };
    },

    /**
     * Override base implementation of handleClick, which unconditionally
     * removes the item.  In this case, removal of the element is deferred
     * pending confirmation from the Bluetooth adapter.
     * @param {Event} e The click event object.
     * @override
     */
    handleClick: function(e) {
      if (this.disabled)
        return;

      var target = /** @type {HTMLElement} */(e.target);
      if (!target.classList.contains('row-delete-button'))
        return;

      var item = this.getListItemAncestor(target);
      var selected = this.selectionModel.selectedIndex;
      var index = this.getIndexOfListItem(item);
      if (item && item.deletable) {
        if (selected != index)
          this.setSelectedDevice_(item.data.address);
        // Device is busy until we hear back from the Bluetooth adapter.
        // Prevent double removal request.
        item.deletable = false;
        // TODO(kevers): Provide visual feedback that the device is busy.

        // Inform the bluetooth adapter that we are disconnecting or
        // forgetting the device.
        var address = item.data.address;
        if (item.connected) {
          chrome.bluetoothPrivate.disconnectAll(address, function() {
            if (chrome.runtime.lastError) {
              options.BluetoothPairing.showMessage(
                  {message: 'bluetoothDisconnectFailed', address: address});
            }
          });
        } else {
          chrome.bluetoothPrivate.forgetDevice(address, function() {
            if (chrome.runtime.lastError) {
              options.BluetoothPairing.showMessage(
                  {message: 'bluetoothForgetFailed', address: address});
            }
          });
        }
        chrome.send('coreOptionsUserMetricsAction',
                    ['Options_BluetoothRemoveDevice']);
      }
    },

    /** @override */
    deleteItemAtIndex: function(index) {
      var selectedDevice = this.getSelectedDevice_();
      this.dataModel.splice(index, 1);
      this.refresh(selectedDevice);
      this.updateListVisibility_();
    },

    /**
     * If the list has an associated empty list placholder then update the
     * visibility of the list and placeholder.
     * @private
     */
    updateListVisibility_: function() {
      var empty = this.dataModel.length == 0;
      var listPlaceHolderID = this.id + '-empty-placeholder';
      if ($(listPlaceHolderID)) {
        if (this.hidden != empty) {
          this.hidden = empty;
          $(listPlaceHolderID).hidden = !empty;
          this.refresh();
        }
      }
    },
  };

  cr.defineProperty(BluetoothListItem, 'connected', cr.PropertyKind.BOOL_ATTR);

  cr.defineProperty(BluetoothListItem, 'paired', cr.PropertyKind.BOOL_ATTR);

  cr.defineProperty(BluetoothListItem, 'connecting', cr.PropertyKind.BOOL_ATTR);

  cr.defineProperty(BluetoothListItem, 'notconnectable',
      cr.PropertyKind.BOOL_ATTR);

  return {
    BluetoothListItem: BluetoothListItem,
    BluetoothDeviceList: BluetoothDeviceList,
    Constants: Constants
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /** @const */ var Page = cr.ui.pageManager.Page;
  /** @const */ var PageManager = cr.ui.pageManager.PageManager;

  /**
   * Encapsulated handling of the Bluetooth options page.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function BluetoothOptions() {
    Page.call(this, 'bluetooth',
              loadTimeData.getString('bluetoothOptionsPageTabTitle'),
              'bluetooth-options');
  }

  cr.addSingletonGetter(BluetoothOptions);

  BluetoothOptions.prototype = {
    __proto__: Page.prototype,

    /**
     * The list of available (unpaired) bluetooth devices.
     * @type {options.DeletableItemList}
     * @private
     */
    deviceList_: null,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);
      this.createDeviceList_();

      $('bluetooth-add-device-cancel-button').onclick = function(event) {
        PageManager.closeOverlay();
      };

      var self = this;
      $('bluetooth-add-device-apply-button').onclick = function(event) {
        chrome.send('coreOptionsUserMetricsAction',
                    ['Options_BluetoothConnectNewDevice']);
        var device = self.deviceList_.selectedItem;
        PageManager.closeOverlay();
        options.BluetoothPairing.connect(device, true);
      };

      $('bluetooth-unpaired-devices-list').addEventListener('change',
                                                            function() {
        var item = $('bluetooth-unpaired-devices-list').selectedItem;
        // The "bluetooth-add-device-apply-button" should be enabled for devices
        // that can be paired or remembered. Devices not supporting pairing will
        // be just remembered and later reported as "item.paired" = true. The
        // button should be disabled in any other case:
        // * No item is selected (item is undefined).
        // * Paired devices (item.paired is true) are already paired and a new
        //   pairing attempt will fail. Paired devices could appear in this list
        //   shortly after the pairing initiated in another window finishes.
        // * "Connecting" devices (item.connecting is true) are in the process
        //   of a pairing or connection. Another attempt to pair before the
        //   ongoing pair finishes will fail, so the button should be disabled.
        var disabled = !item || item.paired || item.connecting;
        $('bluetooth-add-device-apply-button').disabled = disabled;
      });
    },

    /** @override */
    didShowPage: function() {
      chrome.bluetooth.startDiscovery(function() {
        if (chrome.runtime.lastError) {
          console.error(
              'Unexpected error calling bluetooth.startDiscovery: ' +
              chrome.runtime.lastError.message);
        }
      });
      BluetoothOptions.updateDiscoveryState(true);
    },

    /** @override */
    didClosePage: function() {
      chrome.bluetooth.stopDiscovery(function() {
        // The page may get closed before discovery started, so ignore any
        // 'Failed to stop discovery' errors.
        if (chrome.runtime.lastError &&
            chrome.runtime.lastError.message != 'Failed to stop discovery') {
          console.log(
              'Unexpected error calling bluetooth.stopDiscovery: ' +
                  chrome.runtime.lastError.message);

        }
      });
    },

    /**
     * Creates, decorates and initializes the bluetooth device list.
     * @private
     */
    createDeviceList_: function() {
      var deviceList = $('bluetooth-unpaired-devices-list');
      options.system.bluetooth.BluetoothDeviceList.decorate(deviceList);
      this.deviceList_ = assertInstanceof(deviceList,
                                          options.DeletableItemList);
    }
  };

  /**
   * Updates the dialog to show that device discovery has stopped. Updates the
   * label text and hides/unhides the spinner. based on discovery state.
   */
  BluetoothOptions.updateDiscoveryState = function(discovering) {
    $('bluetooth-scanning-label').hidden = !discovering;
    $('bluetooth-scanning-icon').hidden = !discovering;
    $('bluetooth-scan-stopped-label').hidden = discovering;
  };

  /**
   * If the "Add device" dialog is visible, dismiss it.
   */
  BluetoothOptions.dismissOverlay = function() {
    var page = BluetoothOptions.getInstance();
    if (page && page.visible)
      PageManager.closeOverlay();
  };

  // Export
  return {
    BluetoothOptions: BluetoothOptions
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Enumeration of possible states during pairing.  The value associated with
 * each state maps to a localized string in the global variable
 * |loadTimeData|.
 * @enum {string}
 */
var BluetoothPairingEventType = {
  CONNECTING: 'bluetoothStartConnecting',
  ENTER_PIN_CODE: 'bluetoothEnterPinCode',
  ENTER_PASSKEY: 'bluetoothEnterPasskey',
  REMOTE_PIN_CODE: 'bluetoothRemotePinCode',
  REMOTE_PASSKEY: 'bluetoothRemotePasskey',
  CONFIRM_PASSKEY: 'bluetoothConfirmPasskey',
  CONNECT_FAILED: 'bluetoothConnectFailed',
  CANCELED: 'bluetoothPairingCanceled',
  DISMISSED: 'bluetoothPairingDismissed', // pairing dismissed (succeeded or
                                          // canceled).
  NOOP: ''  // Update device but do not show or update the dialog.
};

/**
 * @typedef {{pairing: (BluetoothPairingEventType|undefined),
 *            device: !chrome.bluetooth.Device,
 *            pincode: (string|undefined),
 *            passkey: (number|undefined),
 *            enteredKey: (number|undefined)}}
 */
var BluetoothPairingEvent;

/**
 * Returns a BluetoothPairingEventType corresponding to |event_type|.
 * @param {!chrome.bluetoothPrivate.PairingEventType} event_type
 * @return {BluetoothPairingEventType}
 */
function GetBluetoothPairingEvent(event_type) {
  switch (event_type) {
    case chrome.bluetoothPrivate.PairingEventType.REQUEST_PINCODE:
      return BluetoothPairingEventType.ENTER_PIN_CODE;
    case chrome.bluetoothPrivate.PairingEventType.DISPLAY_PINCODE:
      return BluetoothPairingEventType.REMOTE_PIN_CODE;
    case chrome.bluetoothPrivate.PairingEventType.REQUEST_PASSKEY:
      return BluetoothPairingEventType.ENTER_PASSKEY;
    case chrome.bluetoothPrivate.PairingEventType.DISPLAY_PASSKEY:
      return BluetoothPairingEventType.REMOTE_PASSKEY;
    case chrome.bluetoothPrivate.PairingEventType.KEYS_ENTERED:
      return BluetoothPairingEventType.NOOP;
    case chrome.bluetoothPrivate.PairingEventType.CONFIRM_PASSKEY:
      return BluetoothPairingEventType.CONFIRM_PASSKEY;
    case chrome.bluetoothPrivate.PairingEventType.REQUEST_AUTHORIZATION:
      return BluetoothPairingEventType.NOOP;
    case chrome.bluetoothPrivate.PairingEventType.COMPLETE:
      return BluetoothPairingEventType.NOOP;
  }
  return BluetoothPairingEventType.NOOP;
}

cr.define('options', function() {
  /** @const */ var Page = cr.ui.pageManager.Page;
  /** @const */ var PageManager = cr.ui.pageManager.PageManager;

  /**
   * List of IDs for conditionally visible elements in the dialog.
   * @type {Array<string>}
   * @const
   */
  var ELEMENTS = ['bluetooth-pairing-passkey-display',
                  'bluetooth-pairing-passkey-entry',
                  'bluetooth-pairing-pincode-entry',
                  'bluetooth-pair-device-connect-button',
                  'bluetooth-pair-device-cancel-button',
                  'bluetooth-pair-device-accept-button',
                  'bluetooth-pair-device-reject-button',
                  'bluetooth-pair-device-dismiss-button'];

  /**
   * Encapsulated handling of the Bluetooth device pairing page.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function BluetoothPairing() {
    Page.call(this, 'bluetoothPairing',
              loadTimeData.getString('bluetoothOptionsPageTabTitle'),
              'bluetooth-pairing');
  }

  cr.addSingletonGetter(BluetoothPairing);

  BluetoothPairing.prototype = {
    __proto__: Page.prototype,

    /**
     * Device pairing event.
     * @type {?BluetoothPairingEvent}
     * @private
     */
    event_: null,

    /**
     * Can the dialog be programmatically dismissed.
     * @type {boolean}
     */
    dismissible_: true,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);
      var self = this;
      $('bluetooth-pair-device-cancel-button').onclick = function() {
        PageManager.closeOverlay();
      };
      $('bluetooth-pair-device-reject-button').onclick = function() {
        var options = {
          device: self.event_.device,
          response: chrome.bluetoothPrivate.PairingResponse.REJECT
        };
        chrome.bluetoothPrivate.setPairingResponse(options);
        self.event_.pairing = BluetoothPairingEventType.DISMISSED;
        PageManager.closeOverlay();
      };
      $('bluetooth-pair-device-connect-button').onclick = function() {
        // Prevent sending a 'connect' command twice.
        $('bluetooth-pair-device-connect-button').disabled = true;

        var options = {
          device: self.event_.device,
          response: chrome.bluetoothPrivate.PairingResponse.CONFIRM
        };
        var passkey = self.event_.passkey;
        if (passkey) {
          options.passkey = passkey;
        } else if (!$('bluetooth-pairing-passkey-entry').hidden) {
          options.passkey = parseInt($('bluetooth-passkey').value, 10);
        } else if (!$('bluetooth-pairing-pincode-entry').hidden) {
          options.pincode = $('bluetooth-pincode').value;
        } else {
          BluetoothPairing.connect(self.event_.device);
          return;
        }
        chrome.bluetoothPrivate.setPairingResponse(options);
        var event = /** @type {!BluetoothPairingEvent} */ ({
          pairing: BluetoothPairingEventType.CONNECTING,
          device: self.event_.device
        });
        BluetoothPairing.showDialog(event);
      };
      $('bluetooth-pair-device-accept-button').onclick = function() {
        var options = {
          device: self.event_.device,
          response: chrome.bluetoothPrivate.PairingResponse.CONFIRM
        };
        chrome.bluetoothPrivate.setPairingResponse(options);
        // Prevent sending a 'accept' command twice.
        $('bluetooth-pair-device-accept-button').disabled = true;
      };
      $('bluetooth-pair-device-dismiss-button').onclick = function() {
        PageManager.closeOverlay();
      };
      $('bluetooth-passkey').oninput = function() {
        var inputField = $('bluetooth-passkey');
        var value = inputField.value;
        // Note that using <input type="number"> is insufficient to restrict
        // the input as it allows negative numbers and does not limit the
        // number of charactes typed even if a range is set.  Furthermore,
        // it sometimes produces strange repaint artifacts.
        var filtered = value.replace(/[^0-9]/g, '');
        if (filtered != value)
          inputField.value = filtered;
        $('bluetooth-pair-device-connect-button').disabled =
            inputField.value.length == 0;
      };
      $('bluetooth-pincode').oninput = function() {
        $('bluetooth-pair-device-connect-button').disabled =
            $('bluetooth-pincode').value.length == 0;
      };
      $('bluetooth-passkey').addEventListener('keydown',
          this.keyDownEventHandler_.bind(this));
      $('bluetooth-pincode').addEventListener('keydown',
          this.keyDownEventHandler_.bind(this));
    },

    /** @override */
    didClosePage: function() {
      if (this.event_ &&
          this.event_.pairing != BluetoothPairingEventType.DISMISSED &&
          this.event_.pairing != BluetoothPairingEventType.CONNECT_FAILED) {
        this.event_.pairing = BluetoothPairingEventType.CANCELED;
        var options = {
          device: this.event_.device,
          response: chrome.bluetoothPrivate.PairingResponse.CANCEL
        };
        chrome.bluetoothPrivate.setPairingResponse(options);
      }
    },

    /**
     * Override to prevent showing the overlay if the Bluetooth device details
     * have not been specified.  Prevents showing an empty dialog if the user
     * quits and restarts Chrome while in the process of pairing with a device.
     * @return {boolean} True if the overlay can be displayed.
     */
    canShowPage: function() {
      return !!(this.event_ && this.event_.device.address &&
                this.event_.pairing);
    },

    /**
     * Sets input focus on the passkey or pincode field if appropriate.
     */
    didShowPage: function() {
      if (!$('bluetooth-pincode').hidden)
        $('bluetooth-pincode').focus();
      else if (!$('bluetooth-passkey').hidden)
        $('bluetooth-passkey').focus();
    },

    /**
     * Configures the overlay for pairing a device.
     * @param {!BluetoothPairingEvent} event
     * @param {boolean=} opt_notDismissible
     */
    update: function(event, opt_notDismissible) {
      assert(event);
      assert(event.device);
      if (this.event_ == undefined ||
          this.event_.device.address != event.device.address) {
        // New event or device, create a new BluetoothPairingEvent.
        this.event_ =
            /** @type {BluetoothPairingEvent} */ ({device: event.device});
      } else {
        // Update to an existing event; just update |device| in case it changed.
        this.event_.device = event.device;
      }

      if (event.pairing)
        this.event_.pairing = event.pairing;

      if (!this.event_.pairing)
        return;

      if (this.event_.pairing == BluetoothPairingEventType.CANCELED) {
        // If we receive an update after canceling a pairing (e.g. a key
        // press), ignore it and clear the device so that future updates for
        // the device will also be ignored.
        this.event_.device.address = '';
        return;
      }

      if (event.pincode != undefined)
        this.event_.pincode = event.pincode;
      if (event.passkey != undefined)
        this.event_.passkey = event.passkey;
      if (event.enteredKey != undefined)
        this.event_.enteredKey = event.enteredKey;

      // Update the list model (in case, e.g. the name changed).
      if (this.event_.device.name) {
        var list = $('bluetooth-unpaired-devices-list');
        if (list) {  // May be undefined in tests.
          var index = list.find(this.event_.device.address);
          if (index != undefined)
            list.dataModel.splice(index, 1, this.event_.device);
        }
      }

      // Update the pairing instructions.
      var instructionsEl = assert($('bluetooth-pairing-instructions'));
      this.clearElement_(instructionsEl);
      this.dismissible_ = opt_notDismissible !== true;
      var message = loadTimeData.getString(this.event_.pairing);
      assert(typeof this.event_.device.name == 'string');
      message = message.replace(
          '%1', /** @type {string} */(this.event_.device.name));
      instructionsEl.textContent = message;

      // Update visibility of dialog elements.
      if (this.event_.passkey) {
        this.updatePasskey_(String(this.event_.passkey));
        if (this.event_.pairing == BluetoothPairingEventType.CONFIRM_PASSKEY) {
          // Confirming a match between displayed passkeys.
          this.displayElements_(['bluetooth-pairing-passkey-display',
                                 'bluetooth-pair-device-accept-button',
                                 'bluetooth-pair-device-reject-button']);
          $('bluetooth-pair-device-accept-button').disabled = false;
        } else {
          // Remote entering a passkey.
          this.displayElements_(['bluetooth-pairing-passkey-display',
                                 'bluetooth-pair-device-cancel-button']);
        }
      } else if (this.event_.pincode) {
        this.updatePasskey_(String(this.event_.pincode));
        this.displayElements_(['bluetooth-pairing-passkey-display',
                               'bluetooth-pair-device-cancel-button']);
      } else if (this.event_.pairing ==
                 BluetoothPairingEventType.ENTER_PIN_CODE) {
        // Prompting the user to enter a PIN code.
        this.displayElements_(['bluetooth-pairing-pincode-entry',
                               'bluetooth-pair-device-connect-button',
                               'bluetooth-pair-device-cancel-button']);
        $('bluetooth-pincode').value = '';
      } else if (this.event_.pairing ==
                 BluetoothPairingEventType.ENTER_PASSKEY) {
        // Prompting the user to enter a passkey.
        this.displayElements_(['bluetooth-pairing-passkey-entry',
                               'bluetooth-pair-device-connect-button',
                               'bluetooth-pair-device-cancel-button']);
        $('bluetooth-passkey').value = '';
      } else if (this.event_.pairing == BluetoothPairingEventType.CONNECTING) {
        // Starting the pairing process.
        this.displayElements_(['bluetooth-pair-device-cancel-button']);
      } else {
        // Displaying an error message.
        this.displayElements_(['bluetooth-pair-device-dismiss-button']);
      }
      // User is required to enter a passkey or pincode before the connect
      // button can be enabled.  The 'oninput' methods for the input fields
      // determine when the connect button becomes active.
      $('bluetooth-pair-device-connect-button').disabled = true;
    },

    /**
     * Handles the ENTER key for the passkey or pincode entry field.
     * @param {Event} event A keydown event.
     * @private
     */
    keyDownEventHandler_: function(event) {
      /** @const */ var ENTER_KEY_CODE = 13;
      if (event.keyCode == ENTER_KEY_CODE) {
        var button = $('bluetooth-pair-device-connect-button');
        if (!button.hidden)
          button.click();
      }
    },

    /**
     * Updates the visibility of elements in the dialog.
     * @param {Array<string>} list List of conditionally visible elements that
     *     are to be made visible.
     * @private
     */
    displayElements_: function(list) {
      var enabled = {};
      for (var i = 0; i < list.length; i++) {
        var key = list[i];
        enabled[key] = true;
      }
      for (var i = 0; i < ELEMENTS.length; i++) {
        var key = ELEMENTS[i];
        $(key).hidden = !enabled[key];
      }
    },

    /**
     * Removes all children from an element.
     * @param {!Element} element Target element to clear.
     */
    clearElement_: function(element) {
      var child = element.firstChild;
      while (child) {
        element.removeChild(child);
        child = element.firstChild;
      }
    },

    /**
     * Formats an element for displaying the passkey or PIN code.
     * @param {string} key Passkey or PIN to display.
     */
    updatePasskey_: function(key) {
      var passkeyEl = assert($('bluetooth-pairing-passkey-display'));
      var keyClass =
          (this.event_.pairing == BluetoothPairingEventType.REMOTE_PASSKEY ||
           this.event_.pairing == BluetoothPairingEventType.REMOTE_PIN_CODE) ?
              'bluetooth-keyboard-button' :
              'bluetooth-passkey-char';
      this.clearElement_(passkeyEl);
      // Passkey should always have 6 digits.
      key = '000000'.substring(0, 6 - key.length) + key;
      var progress = this.event_.enteredKey;
      for (var i = 0; i < key.length; i++) {
        var keyEl = document.createElement('span');
        keyEl.textContent = key.charAt(i);
        keyEl.className = keyClass;
        if (progress != undefined) {
          if (i < progress)
            keyEl.classList.add('key-typed');
          else if (i == progress)
            keyEl.classList.add('key-next');
          else
            keyEl.classList.add('key-untyped');
        }
        passkeyEl.appendChild(keyEl);
      }
      if (this.event_.pairing == BluetoothPairingEventType.REMOTE_PASSKEY ||
          this.event_.pairing == BluetoothPairingEventType.REMOTE_PIN_CODE) {
        // Add enter key.
        var label = loadTimeData.getString('bluetoothEnterKey');
        var keyEl = document.createElement('span');
        keyEl.textContent = label;
        keyEl.className = keyClass;
        keyEl.id = 'bluetooth-enter-key';
        if (progress != undefined) {
          if (progress > key.length)
            keyEl.classList.add('key-typed');
          else if (progress == key.length)
            keyEl.classList.add('key-next');
          else
            keyEl.classList.add('key-untyped');
        }
        passkeyEl.appendChild(keyEl);
      }
      passkeyEl.hidden = false;
    },
  };

  /**
   * Configures the device pairing instructions and displays the pairing
   * overlay.
   * @param {!BluetoothPairingEvent} event
   * @param {boolean=} opt_notDismissible If set to true, the dialog can not
   *     be dismissed.
   */
  BluetoothPairing.showDialog = function(event, opt_notDismissible) {
    BluetoothPairing.getInstance().update(event, opt_notDismissible);
    PageManager.showPageByName('bluetoothPairing', false);
  };


  /**
   * Handles bluetoothPrivate onPairing events.
   * @param {!chrome.bluetoothPrivate.PairingEvent} event
   */
  BluetoothPairing.onBluetoothPairingEvent = function(event) {
    var dialog = BluetoothPairing.getInstance();
    if (!dialog.event_ || dialog.event_.device.address != event.device.address)
      return;  // Ignore events not associated with an active connect or pair.
    var pairingEvent = /** @type {!BluetoothPairingEvent} */ ({
      pairing: GetBluetoothPairingEvent(event.pairing),
      device: event.device,
      pincode: event.pincode,
      passkey: event.passkey,
      enteredKey: event.enteredKey
    });
    dialog.update(pairingEvent);
    PageManager.showPageByName('bluetoothPairing', false);
  };

  /**
   * Displays a message from the Bluetooth adapter.
   * @param {{message: string, address: string}} data Data for constructing the
   *     message. |data.message| is the name of message to show. |data.address|
   *     is the device address.
   */
  BluetoothPairing.showMessage = function(data) {
    /** @type {string} */ var name = data.address;
    if (name.length == 0)
      return;
    var dialog = BluetoothPairing.getInstance();
    if (dialog.event_ && name == dialog.event_.device.address &&
        dialog.event_.pairing == BluetoothPairingEventType.CANCELED) {
      // Do not show any error message after cancelation of the pairing.
      return;
    }

    var list = $('bluetooth-paired-devices-list');
    if (list) {
      var index = list.find(name);
      if (index == undefined) {
        list = $('bluetooth-unpaired-devices-list');
        index = list.find(name);
      }
      if (index != undefined) {
        var entry = list.dataModel.item(index);
        if (entry && entry.name)
          name = /** @type {string} */ (entry.name);
      }
    }
    var event = /** @type {!BluetoothPairingEvent} */ ({
      pairing: /** @type {BluetoothPairingEventType} */ (data.message),
      device: /** @type {!chrome.bluetooth.Device} */ ({
        name: name,
        address: data.address,
      })
    });
    BluetoothPairing.showDialog(event, true /* not dismissible */);
  };

  /**
   * Sends a connect request to the bluetoothPrivate API. If there is an error
   * the pairing dialog will be shown with the error message.
   * @param {!chrome.bluetooth.Device} device
   * @param {boolean=} opt_showConnecting If true, show 'connecting' message in
   *     the pairing dialog.
   */
  BluetoothPairing.connect = function(device, opt_showConnecting) {
    if (opt_showConnecting) {
      var event = /** @type {!BluetoothPairingEvent} */ (
          {pairing: BluetoothPairingEventType.CONNECTING, device: device});
      BluetoothPairing.showDialog(event);
    }
    var address = device.address;
    chrome.bluetoothPrivate.connect(address, function(result) {
      BluetoothPairing.connectCompleted_(address, result);
    });
  };

  /**
   * Connect request completion callback.
   * @param {string} address
   * @param {chrome.bluetoothPrivate.ConnectResultType} result
   */
  BluetoothPairing.connectCompleted_ = function(address, result) {
    var message;
    if (chrome.runtime.lastError) {
      var errorMessage = chrome.runtime.lastError.message;
      if (errorMessage != 'Connect failed') {
        console.error('bluetoothPrivate.connect: Unexpected error for: ' +
                      address + ': ' + errorMessage);
      }
    }
    switch (result) {
      case chrome.bluetoothPrivate.ConnectResultType.SUCCESS:
      case chrome.bluetoothPrivate.ConnectResultType.ALREADY_CONNECTED:
        BluetoothPairing.dismissDialog();
        return;
      case chrome.bluetoothPrivate.ConnectResultType.UNKNOWN_ERROR:
        message = 'bluetoothConnectUnknownError';
        break;
      case chrome.bluetoothPrivate.ConnectResultType.IN_PROGRESS:
        message = 'bluetoothConnectInProgress';
        break;
      case chrome.bluetoothPrivate.ConnectResultType.FAILED:
        message = 'bluetoothConnectFailed';
        break;
      case chrome.bluetoothPrivate.ConnectResultType.AUTH_FAILED:
        message = 'bluetoothConnectAuthFailed';
        break;
      case chrome.bluetoothPrivate.ConnectResultType.AUTH_CANCELED:
        message = 'bluetoothConnectAuthCanceled';
        break;
      case chrome.bluetoothPrivate.ConnectResultType.AUTH_REJECTED:
        message = 'bluetoothConnectAuthRejected';
        break;
      case chrome.bluetoothPrivate.ConnectResultType.AUTH_TIMEOUT:
        message = 'bluetoothConnectAuthTimeout';
        break;
      case chrome.bluetoothPrivate.ConnectResultType.UNSUPPORTED_DEVICE:
        message = 'bluetoothConnectUnsupportedDevice';
        break;
      case chrome.bluetoothPrivate.ConnectResultType.ATTRIBUTE_LENGTH_INVALID:
        message = 'bluetoothConnectAttributeLengthInvalid';
        break;
      case chrome.bluetoothPrivate.ConnectResultType.CONNECTION_CONGESTED:
        message = 'bluetoothConnectConnectionCongested';
        break;
      case chrome.bluetoothPrivate.ConnectResultType.INSUFFICIENT_ENCRYPTION:
        message = 'bluetoothConnectInsufficientEncryption';
        break;
      case chrome.bluetoothPrivate.ConnectResultType.OFFSET_INVALID:
        message = 'bluetoothConnectOffsetInvalid';
        break;
      case chrome.bluetoothPrivate.ConnectResultType.READ_NOT_PERMITTED:
        message = 'bluetoothConnectReadNotPermitted';
        break;
      case chrome.bluetoothPrivate.ConnectResultType.REQUEST_NOT_SUPPORTED:
        message = 'bluetoothConnectRequestNotSupported';
        break;
      case chrome.bluetoothPrivate.ConnectResultType.WRITE_NOT_PERMITTED:
        message = 'bluetoothConnectWriteNotPermitted';
        break;
    }
    if (message)
      BluetoothPairing.showMessage({message: message, address: address});
  };

  /**
   * Closes the Bluetooth pairing dialog.
   */
  BluetoothPairing.dismissDialog = function() {
    var overlay = PageManager.getTopmostVisiblePage();
    var dialog = BluetoothPairing.getInstance();
    if (overlay == dialog && dialog.dismissible_) {
      if (dialog.event_)
        dialog.event_.pairing = BluetoothPairingEventType.DISMISSED;
      PageManager.closeOverlay();
    }
  };

  // Export
  return {
    BluetoothPairing: BluetoothPairing
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  var Page = cr.ui.pageManager.Page;
  var PageManager = cr.ui.pageManager.PageManager;

  /////////////////////////////////////////////////////////////////////////////
  // AccountsOptions class:

  /**
   * Encapsulated handling of ChromeOS accounts options page.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function AccountsOptions(model) {
    Page.call(this, 'accounts', loadTimeData.getString('accountsPageTabTitle'),
              'accountsPage');
    // Whether to show the whitelist.
    this.showWhitelist_ = false;
  }

  cr.addSingletonGetter(AccountsOptions);

  AccountsOptions.prototype = {
    // Inherit AccountsOptions from Page.
    __proto__: Page.prototype,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      // Set up accounts page.
      var userList = $('userList');
      userList.addEventListener('remove', this.handleRemoveUser_);

      var userNameEdit = $('userNameEdit');
      options.accounts.UserNameEdit.decorate(userNameEdit);
      userNameEdit.addEventListener('add', this.handleAddUser_);

      // If the current user is not the owner, do not show the user list.
      // If the current user is not the owner, or the device is enterprise
      // managed, show a warning that settings cannot be modified.
      this.showWhitelist_ = UIAccountTweaks.currentUserIsOwner();
      if (this.showWhitelist_) {
        options.accounts.UserList.decorate(userList);
      } else {
        $('ownerOnlyWarning').hidden = false;
        this.managed = AccountsOptions.whitelistIsManaged();
      }

      this.addEventListener('visibleChange', this.handleVisibleChange_);

      $('useWhitelistCheck').addEventListener('change',
          this.handleUseWhitelistCheckChange_.bind(this));

      Preferences.getInstance().addEventListener(
          $('useWhitelistCheck').pref,
          this.handleUseWhitelistPrefChange_.bind(this));

      $('accounts-options-overlay-confirm').onclick =
          PageManager.closeOverlay.bind(PageManager);
    },

    /**
     * Update user list control state.
     * @private
     */
    updateControls_: function() {
      $('userList').disabled =
      $('userNameEdit').disabled = !this.showWhitelist_ ||
                                   AccountsOptions.whitelistIsManaged() ||
                                   !$('useWhitelistCheck').checked;
    },

    /**
     * Handler for Page's visible property change event.
     * @private
     * @param {Event} e Property change event.
     */
    handleVisibleChange_: function(e) {
      if (this.visible) {
        chrome.send('updateWhitelist');
        this.updateControls_();
        if (this.showWhitelist_)
          $('userList').redraw();
      }
    },

    /**
     * Handler for allow guest check change.
     * @private
     */
    handleUseWhitelistCheckChange_: function(e) {
      // Whitelist existing users when guest login is being disabled.
      if ($('useWhitelistCheck').checked) {
        chrome.send('updateWhitelist');
      }

      this.updateControls_();
    },

    /**
     * handler for allow guest pref change.
     * @private
     */
    handleUseWhitelistPrefChange_: function(e) {
      this.updateControls_();
    },

    /**
     * Handler for "add" event fired from userNameEdit.
     * @private
     * @param {Event} e Add event fired from userNameEdit.
     */
    handleAddUser_: function(e) {
      chrome.send('whitelistUser', [e.user.email, e.user.name]);
      chrome.send('coreOptionsUserMetricsAction',
                  ['Options_WhitelistedUser_Add']);
    },

    /**
     * Handler for "remove" event fired from userList.
     * @private
     * @param {Event} e Remove event fired from userList.
     */
    handleRemoveUser_: function(e) {
      chrome.send('unwhitelistUser', [e.user.username]);
      chrome.send('coreOptionsUserMetricsAction',
                  ['Options_WhitelistedUser_Remove']);
    }
  };


  /**
   * Returns whether the whitelist is managed by policy or not.
   */
  AccountsOptions.whitelistIsManaged = function() {
    return loadTimeData.getBoolean('whitelist_is_managed');
  };

  /**
   * Update account picture.
   * @param {string} username User for which to update the image.
   */
  AccountsOptions.updateAccountPicture = function(username) {
    if (this.showWhitelist_)
      $('userList').updateAccountPicture(username);
  };

  // Export
  return {
    AccountsOptions: AccountsOptions
  };

});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options.proxyexceptions', function() {
  /** @const */ var List = cr.ui.List;
  /** @const */ var ListItem = cr.ui.ListItem;
  /** @const */ var ArrayDataModel = cr.ui.ArrayDataModel;

  /**
   * Creates a new exception list.
   * @param {Object=} opt_propertyBag Optional properties.
   * @constructor
   * @extends {cr.ui.List}
   */
  var ProxyExceptions = cr.ui.define('list');

  ProxyExceptions.prototype = {
    __proto__: List.prototype,

    pref: 'cros.session.proxy.ignorelist',

    /** @override */
    decorate: function() {
      List.prototype.decorate.call(this);
      this.autoExpands = true;

      // HACK(arv): http://crbug.com/40902
      window.addEventListener('resize', this.redraw.bind(this));

      this.addEventListener('click', this.handleClick_);

      var self = this;

      // Listens to pref changes.
      Preferences.getInstance().addEventListener(this.pref,
          function(event) {
            self.load_(event.value.value);
          });
    },

    /**
     * @override
     * @param {Object} exception
     */
    createItem: function(exception) {
      return new ProxyExceptionsItem(exception);
    },

    /**
     * Adds given exception to model and update backend.
     * @param {Object} exception A exception to be added to exception list.
     */
    addException: function(exception) {
      this.dataModel.push(exception);
      this.updateBackend_();
    },

    /**
     * Removes given exception from model and update backend.
     */
    removeException: function(exception) {
      var dataModel = this.dataModel;

      var index = dataModel.indexOf(exception);
      if (index >= 0) {
        dataModel.splice(index, 1);
        this.updateBackend_();
      }
    },

    /**
     * Handles the clicks on the list and triggers exception removal if the
     * click is on the remove exception button.
     * @private
     * @param {!Event} e The click event object.
     */
    handleClick_: function(e) {
      // Handle left button click
      if (e.button == 0) {
        var el = e.target;
        if (el.className == 'remove-exception-button') {
          this.removeException(el.parentNode.exception);
        }
      }
    },

    /**
     * Loads given exception list.
     * @param {!Array} exceptions An array of exception object.
     */
    load_: function(exceptions) {
      this.dataModel = new ArrayDataModel(exceptions);
    },

    /**
     * Updates backend.
     */
    updateBackend_: function() {
      Preferences.setListPref(this.pref, this.dataModel.slice(), true);
    }
  };

  /**
   * Creates a new exception list item.
   * @param {Object} exception The exception account this represents.
   * @constructor
   * @extends {cr.ui.ListItem}
   */
  function ProxyExceptionsItem(exception) {
    var el = cr.doc.createElement('div');
    el.exception = exception;
    ProxyExceptionsItem.decorate(el);
    return el;
  }

  /**
   * Decorates an element as a exception account item.
   * @param {!HTMLElement} el The element to decorate.
   */
  ProxyExceptionsItem.decorate = function(el) {
    el.__proto__ = ProxyExceptionsItem.prototype;
    el.decorate();
  };

  ProxyExceptionsItem.prototype = {
    __proto__: ListItem.prototype,

    /** @override */
    decorate: function() {
      ListItem.prototype.decorate.call(this);
      this.className = 'exception-list-item';

      var labelException = this.ownerDocument.createElement('span');
      labelException.className = '';
      labelException.textContent = this.exception;
      this.appendChild(labelException);
    }
  };

  return {
    ProxyExceptions: ProxyExceptions
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options.accounts', function() {
  /** @const */ var List = cr.ui.List;
  /** @const */ var ListItem = cr.ui.ListItem;
  /** @const */ var ArrayDataModel = cr.ui.ArrayDataModel;

  /**
   * Creates a new user list.
   * @param {Object=} opt_propertyBag Optional properties.
   * @constructor
   * @extends {cr.ui.List}
   */
  var UserList = cr.ui.define('list');

  UserList.prototype = {
    __proto__: List.prototype,

    pref: 'cros.accounts.users',

    /** @override */
    decorate: function() {
      List.prototype.decorate.call(this);

      // HACK(arv): http://crbug.com/40902
      window.addEventListener('resize', this.redraw.bind(this));

      var self = this;

      // Listens to pref changes.
      Preferences.getInstance().addEventListener(this.pref,
          function(event) {
            self.load_(event.value.value);
          });
    },

    /**
     * @override
     * @param {Object} user
     */
    createItem: function(user) {
      return new UserListItem(user);
    },

    /**
     * Finds the index of user by given username (canonicalized email).
     * @private
     * @param {string} username The username to look for.
     * @return {number} The index of the found user or -1 if not found.
     */
    indexOf_: function(username) {
      var dataModel = this.dataModel;
      if (!dataModel)
        return -1;

      var length = dataModel.length;
      for (var i = 0; i < length; ++i) {
        var user = dataModel.item(i);
        if (user.username == username) {
          return i;
        }
      }

      return -1;
    },

    /**
     * Update given user's account picture.
     * @param {string} username User for which to update the image.
     */
    updateAccountPicture: function(username) {
      var index = this.indexOf_(username);
      if (index >= 0) {
        var item = this.getListItemByIndex(index);
        if (item)
          item.updatePicture();
      }
    },

    /**
     * Loads given user list.
     * @param {!Array<Object>} users An array of user info objects.
     * @private
     */
    load_: function(users) {
      this.dataModel = new ArrayDataModel(users);
    },

    /**
     * Removes given user from the list.
     * @param {Object} user User info object to be removed from user list.
     * @private
     */
    removeUser_: function(user) {
      var e = new Event('remove');
      e.user = user;
      this.dispatchEvent(e);
    }
  };

  /**
   * Whether the user list is disabled. Only used for display purpose.
   */
  cr.defineProperty(UserList, 'disabled', cr.PropertyKind.BOOL_ATTR);

  /**
   * Creates a new user list item.
   * @param {Object} user The user account this represents.
   * @constructor
   * @extends {cr.ui.ListItem}
   */
  function UserListItem(user) {
    var el = cr.doc.createElement('div');
    el.user = user;
    UserListItem.decorate(el);
    return el;
  }

  /**
   * Decorates an element as a user account item.
   * @param {!HTMLElement} el The element to decorate.
   */
  UserListItem.decorate = function(el) {
    el.__proto__ = UserListItem.prototype;
    el.decorate();
  };

  UserListItem.prototype = {
    __proto__: ListItem.prototype,

    /** @override */
    decorate: function() {
      ListItem.prototype.decorate.call(this);

      this.className = 'user-list-item';

      this.icon_ = this.ownerDocument.createElement('img');
      this.icon_.className = 'user-icon';
      this.updatePicture();

      var labelEmail = this.ownerDocument.createElement('span');
      labelEmail.className = 'user-email-label';
      labelEmail.textContent = this.user.email;

      var labelName = this.ownerDocument.createElement('span');
      labelName.className = 'user-name-label';
      labelName.textContent = this.user.owner ?
          loadTimeData.getStringF('username_format', this.user.name) :
          this.user.name;

      var emailNameBlock = this.ownerDocument.createElement('div');
      emailNameBlock.className = 'user-email-name-block';
      emailNameBlock.appendChild(labelEmail);
      emailNameBlock.appendChild(labelName);
      emailNameBlock.title = this.user.owner ?
          loadTimeData.getStringF('username_format', this.user.email) :
          this.user.email;

      this.appendChild(this.icon_);
      this.appendChild(emailNameBlock);

      if (!this.user.owner) {
        var removeButton = this.ownerDocument.createElement('button');
        removeButton.className =
            'raw-button remove-user-button custom-appearance';
        removeButton.addEventListener(
            'click', this.handleRemoveButtonClick_.bind(this));
        this.appendChild(removeButton);
      }
    },

    /**
     * Handles click on the remove button.
     * @param {Event} e Click event.
     * @private
     */
    handleRemoveButtonClick_: function(e) {
      // Handle left button click
      if (e.button == 0)
        this.parentNode.removeUser_(this.user);
    },

    /**
     * Reloads user picture.
     */
    updatePicture: function() {
      this.icon_.src = 'http://chromesettings.github.io/userimage/' + this.user.username +
                       '?id=' + (new Date()).getTime();
    }
  };

  return {
    UserList: UserList
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options.accounts', function() {
  /**
   * Email alias only, assuming it's a gmail address.
   *   e.g. 'john'
   *        {name: 'john', email: 'john@gmail.com'}
   * @const
   */
  var format1String =
      '^\\s*([\\w\\.!#\\$%&\'\\*\\+-\\/=\\?\\^`\\{\\|\\}~]+)\\s*$';
  /**
   * Email address only.
   *   e.g. 'john@chromium.org'
   *        {name: 'john', email: 'john@chromium.org'}
   * @const
   */
  var format2String =
      '^\\s*([\\w\\.!#\\$%&\'\\*\\+-\\/=\\?\\^`\\{\\|\\}~]+)@' +
      '([A-Za-z0-9\-]{2,63}\\..+)\\s*$';
  /**
   * Full format.
   *   e.g. '"John Doe" <john@chromium.org>'
   *        {name: 'John doe', email: 'john@chromium.org'}
   * @const
   */
  var format3String =
      '^\\s*"{0,1}([^"]+)"{0,1}\\s*' +
      '<([\\w\\.!#\\$%&\'\\*\\+-\\/=\\?\\^`\\{\\|\\}~]+@' +
      '[A-Za-z0-9\-]{2,63}\\..+)>\\s*$';

  /**
   * Creates a new user name edit element.
   * @param {Object=} opt_propertyBag Optional properties.
   * @constructor
   * @extends {HTMLInputElement}
   */
  var UserNameEdit = cr.ui.define('input');

  UserNameEdit.prototype = {
    __proto__: HTMLInputElement.prototype,

    /**
     * Called when an element is decorated as a user name edit.
     */
    decorate: function() {
      this.pattern = format1String + '|' + format2String + '|' +
                     format3String;

      this.onkeydown = this.handleKeyDown_.bind(this);
    },


    /**
     * Parses given str for user info.
     *
     * Note that the email parsing is based on RFC 5322 and does not support
     * IMA (Internationalized Email Address). We take only the following chars
     * as valid for an email alias (aka local-part):
     *   - Letters: aâ€“z, Aâ€“Z
     *   - Digits: 0-9
     *   - Characters: ! # $ % & ' * + - / = ? ^ _ ` { | } ~
     *   - Dot: . (Note that we did not cover the cases that dot should not
     *       appear as first or last character and should not appear two or
     *       more times in a row.)
     *
     * @param {string} str A string to parse.
     * @return {?{name: string, email: string}} User info parsed from the
     *     string.
     */
    parse: function(str) {
      /** @const */ var format1 = new RegExp(format1String);
      /** @const */ var format2 = new RegExp(format2String);
      /** @const */ var format3 = new RegExp(format3String);

      var matches = format1.exec(str);
      if (matches) {
        return {
          name: matches[1],
          email: matches[1] + '@gmail.com'
        };
      }

      matches = format2.exec(str);
      if (matches) {
        return {
          name: matches[1],
          email: matches[1] + '@' + matches[2]
        };
      }

      matches = format3.exec(str);
      if (matches) {
        return {
          name: matches[1],
          email: matches[2]
        };
      }

      return null;
    },

    /**
     * Handler for key down event.
     * @private
     * @param {Event} e The keydown event object.
     */
    handleKeyDown_: function(e) {
      if (e.keyIdentifier == 'Enter') {
        var user = this.parse(this.value);
        if (user) {
          var event = new Event('add');
          event.user = user;
          this.dispatchEvent(event);
        }
        this.select();
        // Avoid double-handling so the dialog doesn't close.
        e.stopPropagation();
      }
    }
  };

  return {
    UserNameEdit: UserNameEdit
  };
});


// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  var Page = cr.ui.pageManager.Page;
  var PageManager = cr.ui.pageManager.PageManager;

  /**
   * ConsumerManagementOverlay class
   * Dialog that allows users to enroll/unenroll consumer management service.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function ConsumerManagementOverlay() {
    Page.call(this, 'consumer-management-overlay',
              loadTimeData.getString('consumerManagementOverlayTabTitle'),
              'consumer-management-overlay');

    $('consumer-management-overlay-enroll').onclick = function(event) {
      chrome.send('enrollConsumerManagement');
      PageManager.closeOverlay();
    };
    $('consumer-management-overlay-unenroll').onclick = function(event) {
      chrome.send('unenrollConsumerManagement');
      PageManager.closeOverlay();
    };
    $('consumer-management-overlay-enroll-cancel').onclick = function(event) {
      PageManager.closeOverlay();
    };
    $('consumer-management-overlay-unenroll-cancel').onclick = function(event) {
      PageManager.closeOverlay();
    };
  }

  cr.addSingletonGetter(ConsumerManagementOverlay);

  ConsumerManagementOverlay.prototype = {
    __proto__: Page.prototype,
  };

  /**
   * Consumer management status.
   * See chrome/browser/chromeos/policy/consumer_management_service.h.
   * @enum {string}
   */
  ConsumerManagementOverlay.Status = {
    STATUS_UNKNOWN: 'StatusUnknown',
    STATUS_ENROLLED: 'StatusEnrolled',
    STATUS_ENROLLING: 'StatusEnrolling',
    STATUS_UNENROLLED: 'StatusUnenrolled',
    STATUS_UNENROLLING: 'StatusUnenrolling'
  };

  /**
   * Shows enrollment or unenrollment content based on the status.
   * @enum {string} status Consumer management service status string.
   */
  ConsumerManagementOverlay.setStatus = function(status) {
    // Status should only be enrolled or unenrolled.
    assert(status == this.Status.STATUS_ENROLLED ||
           status == this.Status.STATUS_UNENROLLED);
    var enrolled = status == this.Status.STATUS_ENROLLED;
    $('enroll-content').hidden = enrolled;
    $('unenroll-content').hidden = !enrolled;
  };

  // Export
  return {
    ConsumerManagementOverlay: ConsumerManagementOverlay
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.exportPath('options');

/**
 * @typedef {{
 *   availableColorProfiles: Array<{profileId: number, name: string}>,
 *   colorProfile: number,
 *   height: number,
 *   id: string,
 *   isInternal: boolean,
 *   isPrimary: boolean,
 *   resolutions: Array<{width: number, height: number, originalWidth: number,
 *       originalHeight: number, deviceScaleFactor: number, scale: number,
 *       refreshRate: number, isBest: boolean, selected: boolean}>,
 *   name: string,
 *   orientation: number,
 *   width: number,
 *   x: number,
 *   y: number
 * }}
 */
options.DisplayInfo;

/**
 * Enumeration of secondary display layout.  The value has to be same as the
 * values in ash/display/display_controller.cc.
 * @enum {number}
 */
options.SecondaryDisplayLayout = {
  TOP: 0,
  RIGHT: 1,
  BOTTOM: 2,
  LEFT: 3
};

/**
 * Enumeration of multi display mode.  The value has to be same as the
 * values in ash/display/display_manager..
 * @enum {number}
 */
options.MultiDisplayMode = {
  EXTENDED: 0,
  MIRRORING: 1,
  UNIFIED: 2,
};

cr.define('options', function() {
  var Page = cr.ui.pageManager.Page;
  var PageManager = cr.ui.pageManager.PageManager;

  // The scale ratio of the display rectangle to its original size.
  /** @const */ var VISUAL_SCALE = 1 / 10;

  // The number of pixels to share the edges between displays.
  /** @const */ var MIN_OFFSET_OVERLAP = 5;

  /**
   * Calculates the bounds of |element| relative to the page.
   * @param {HTMLElement} element The element to be known.
   * @return {Object} The object for the bounds, with x, y, width, and height.
   */
  function getBoundsInPage(element) {
    var bounds = {
      x: element.offsetLeft,
      y: element.offsetTop,
      width: element.offsetWidth,
      height: element.offsetHeight
    };
    var parent = element.offsetParent;
    while (parent && parent != document.body) {
      bounds.x += parent.offsetLeft;
      bounds.y += parent.offsetTop;
      parent = parent.offsetParent;
    }
    return bounds;
  }

  /**
   * Gets the position of |point| to |rect|, left, right, top, or bottom.
   * @param {Object} rect The base rectangle with x, y, width, and height.
   * @param {Object} point The point to check the position.
   * @return {options.SecondaryDisplayLayout} The position of the calculated
   *     point.
   */
  function getPositionToRectangle(rect, point) {
    // Separates the area into four (LEFT/RIGHT/TOP/BOTTOM) by the diagonals of
    // the rect, and decides which area the display should reside.
    var diagonalSlope = rect.height / rect.width;
    var topDownIntercept = rect.y - rect.x * diagonalSlope;
    var bottomUpIntercept = rect.y + rect.height + rect.x * diagonalSlope;

    if (point.y > topDownIntercept + point.x * diagonalSlope) {
      if (point.y > bottomUpIntercept - point.x * diagonalSlope)
        return options.SecondaryDisplayLayout.BOTTOM;
      else
        return options.SecondaryDisplayLayout.LEFT;
    } else {
      if (point.y > bottomUpIntercept - point.x * diagonalSlope)
        return options.SecondaryDisplayLayout.RIGHT;
      else
        return options.SecondaryDisplayLayout.TOP;
    }
  }

  /**
   * Encapsulated handling of the 'Display' page.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function DisplayOptions() {
    Page.call(this, 'display',
              loadTimeData.getString('displayOptionsPageTabTitle'),
              'display-options-page');
  }

  cr.addSingletonGetter(DisplayOptions);

  DisplayOptions.prototype = {
    __proto__: Page.prototype,

    /**
     * Whether the current output status is mirroring displays or not.
     * @private
     */
    mirroring_: false,

    /**
     * Whether the unified desktop is enable or not.
     * @private
     */
    unifiedDesktopEnabled_: false,

    /**
     * Whether the unified desktop option should be present.
     * @private
     */
    showUnifiedDesktopOption_: false,

    /**
     * The current secondary display layout.
     * @private
     */
    layout_: options.SecondaryDisplayLayout.RIGHT,

    /**
     * The array of current output displays.  It also contains the display
     * rectangles currently rendered on screen.
     * @type {Array<options.DisplayInfo>}
     * @private
     */
    displays_: [],

    /**
     * The index for the currently focused display in the options UI.  null if
     * no one has focus.
     * @private
     */
    focusedIndex_: null,

    /**
     * The primary display.
     * @private
     */
    primaryDisplay_: null,

    /**
     * The secondary display.
     * @private
     */
    secondaryDisplay_: null,

    /**
     * The container div element which contains all of the display rectangles.
     * @private
     */
    displaysView_: null,

    /**
     * The scale factor of the actual display size to the drawn display
     * rectangle size.
     * @private
     */
    visualScale_: VISUAL_SCALE,

    /**
     * The location where the last touch event happened.  This is used to
     * prevent unnecessary dragging events happen.  Set to null unless it's
     * during touch events.
     * @private
     */
    lastTouchLocation_: null,

    /**
     * Whether the display settings can be shown.
     * @private
     */
    enabled_: true,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      $('display-options-select-mirroring').onchange = (function() {
        this.mirroring_ =
            $('display-options-select-mirroring').value == 'mirroring';
        chrome.send('setMirroring', [this.mirroring_]);
      }).bind(this);

      var container = $('display-options-displays-view-host');
      container.onmousemove = this.onMouseMove_.bind(this);
      window.addEventListener('mouseup', this.endDragging_.bind(this), true);
      container.ontouchmove = this.onTouchMove_.bind(this);
      container.ontouchend = this.endDragging_.bind(this);

      $('display-options-set-primary').onclick = (function() {
        chrome.send('setPrimary', [this.displays_[this.focusedIndex_].id]);
      }).bind(this);
      $('display-options-resolution-selection').onchange = (function(ev) {
        var display = this.displays_[this.focusedIndex_];
        var resolution = display.resolutions[ev.target.value];
        chrome.send('setDisplayMode', [display.id, resolution]);
      }).bind(this);
      $('display-options-orientation-selection').onchange = (function(ev) {
        var displayIndex =
          (this.focusedIndex_ === null) ? 0 : this.focusedIndex_;
        chrome.send('setOrientation', [this.displays_[displayIndex].id,
                                       ev.target.value]);
      }).bind(this);
      $('display-options-color-profile-selection').onchange = (function(ev) {
        chrome.send('setColorProfile', [this.displays_[this.focusedIndex_].id,
                                        ev.target.value]);
      }).bind(this);
      $('selected-display-start-calibrating-overscan').onclick = (function() {
        // Passes the target display ID. Do not specify it through URL hash,
        // we do not care back/forward.
        var displayOverscan = options.DisplayOverscan.getInstance();
        displayOverscan.setDisplayId(this.displays_[this.focusedIndex_].id);
        PageManager.showPageByName('displayOverscan');
        chrome.send('coreOptionsUserMetricsAction',
                    ['Options_DisplaySetOverscan']);
      }).bind(this);

      $('display-options-done').onclick = function() {
        PageManager.closeOverlay();
      };

      $('display-options-toggle-unified-desktop').onclick = (function() {
        this.unifiedDesktopEnabled_ = !this.unifiedDesktopEnabled_;
        chrome.send('setUnifiedDesktopEnabled',
                    [this.unifiedDesktopEnabled_]);
      }).bind(this);
    },

    /** @override */
    didShowPage: function() {
      var optionTitles = document.getElementsByClassName(
          'selected-display-option-title');
      var maxSize = 0;
      for (var i = 0; i < optionTitles.length; i++)
        maxSize = Math.max(maxSize, optionTitles[i].clientWidth);
      for (var i = 0; i < optionTitles.length; i++)
        optionTitles[i].style.width = maxSize + 'px';
      chrome.send('getDisplayInfo');
    },

    /** @override */
    canShowPage: function() {
      return this.enabled_;
    },

    /**
     * Enables or disables the page. When disabled, the page will not be able to
     * open, and will close if currently opened.
     * @param {boolean} enabled Whether the page should be enabled.
     * @param {boolean} showUnifiedDesktop Whether the unified desktop option
     *     should be present.
     */
    setEnabled: function(enabled, showUnifiedDesktop) {
      if (this.enabled_ == enabled &&
          this.showUnifiedDesktopOption_ == showUnifiedDesktop) {
        return;
      }
      this.enabled_ = enabled;
      this.showUnifiedDesktopOption_ = showUnifiedDesktop;
      if (!enabled && this.visible)
        PageManager.closeOverlay();
    },

    /**
     * Mouse move handler for dragging display rectangle.
     * @param {Event} e The mouse move event.
     * @private
     */
    onMouseMove_: function(e) {
      return this.processDragging_(e, {x: e.pageX, y: e.pageY});
    },

    /**
     * Touch move handler for dragging display rectangle.
     * @param {Event} e The touch move event.
     * @private
     */
    onTouchMove_: function(e) {
      if (e.touches.length != 1)
        return true;

      var touchLocation = {x: e.touches[0].pageX, y: e.touches[0].pageY};
      // Touch move events happen even if the touch location doesn't change, but
      // it doesn't need to process the dragging.  Since sometimes the touch
      // position changes slightly even though the user doesn't think to move
      // the finger, very small move is just ignored.
      /** @const */ var IGNORABLE_TOUCH_MOVE_PX = 1;
      var xDiff = Math.abs(touchLocation.x - this.lastTouchLocation_.x);
      var yDiff = Math.abs(touchLocation.y - this.lastTouchLocation_.y);
      if (xDiff <= IGNORABLE_TOUCH_MOVE_PX &&
          yDiff <= IGNORABLE_TOUCH_MOVE_PX) {
        return true;
      }

      this.lastTouchLocation_ = touchLocation;
      return this.processDragging_(e, touchLocation);
    },

    /**
     * Mouse down handler for dragging display rectangle.
     * @param {Event} e The mouse down event.
     * @private
     */
    onMouseDown_: function(e) {
      if (this.mirroring_)
        return true;

      if (e.button != 0)
        return true;

      e.preventDefault();
      var target = assertInstanceof(e.target, HTMLElement);
      return this.startDragging_(target, {x: e.pageX, y: e.pageY});
    },

    /**
     * Touch start handler for dragging display rectangle.
     * @param {Event} e The touch start event.
     * @private
     */
    onTouchStart_: function(e) {
      if (this.mirroring_)
        return true;

      if (e.touches.length != 1)
        return false;

      e.preventDefault();
      var touch = e.touches[0];
      this.lastTouchLocation_ = {x: touch.pageX, y: touch.pageY};
      var target = assertInstanceof(e.target, HTMLElement);
      return this.startDragging_(target, this.lastTouchLocation_);
    },

    /**
     * Collects the current data and sends it to Chrome.
     * @private
     */
    applyResult_: function() {
      // Offset is calculated from top or left edge.
      var primary = this.primaryDisplay_;
      var secondary = this.secondaryDisplay_;
      var offset;
      if (this.layout_ == options.SecondaryDisplayLayout.LEFT ||
          this.layout_ == options.SecondaryDisplayLayout.RIGHT) {
        offset = secondary.div.offsetTop - primary.div.offsetTop;
      } else {
        offset = secondary.div.offsetLeft - primary.div.offsetLeft;
      }
      chrome.send('setDisplayLayout',
                  [this.layout_, offset / this.visualScale_]);
    },

    /**
     * Snaps the region [point, width] to [basePoint, baseWidth] if
     * the [point, width] is close enough to the base's edge.
     * @param {number} point The starting point of the region.
     * @param {number} width The width of the region.
     * @param {number} basePoint The starting point of the base region.
     * @param {number} baseWidth The width of the base region.
     * @return {number} The moved point.  Returns point itself if it doesn't
     *     need to snap to the edge.
     * @private
     */
    snapToEdge_: function(point, width, basePoint, baseWidth) {
      // If the edge of the regions is smaller than this, it will snap to the
      // base's edge.
      /** @const */ var SNAP_DISTANCE_PX = 16;

      var startDiff = Math.abs(point - basePoint);
      var endDiff = Math.abs(point + width - (basePoint + baseWidth));
      // Prefer the closer one if both edges are close enough.
      if (startDiff < SNAP_DISTANCE_PX && startDiff < endDiff)
        return basePoint;
      else if (endDiff < SNAP_DISTANCE_PX)
        return basePoint + baseWidth - width;

      return point;
    },

    /**
     * Processes the actual dragging of display rectangle.
     * @param {Event} e The event which triggers this drag.
     * @param {Object} eventLocation The location where the event happens.
     * @private
     */
    processDragging_: function(e, eventLocation) {
      if (!this.dragging_)
        return true;

      var index = -1;
      for (var i = 0; i < this.displays_.length; i++) {
        if (this.displays_[i] == this.dragging_.display) {
          index = i;
          break;
        }
      }
      if (index < 0)
        return true;

      e.preventDefault();

      // Note that current code of moving display-rectangles doesn't work
      // if there are >=3 displays.  This is our assumption for M21.
      // TODO(mukai): Fix the code to allow >=3 displays.
      var newPosition = {
        x: this.dragging_.originalLocation.x +
            (eventLocation.x - this.dragging_.eventLocation.x),
        y: this.dragging_.originalLocation.y +
            (eventLocation.y - this.dragging_.eventLocation.y)
      };

      var baseDiv = this.dragging_.display.isPrimary ?
          this.secondaryDisplay_.div : this.primaryDisplay_.div;
      var draggingDiv = this.dragging_.display.div;

      newPosition.x = this.snapToEdge_(newPosition.x, draggingDiv.offsetWidth,
                                       baseDiv.offsetLeft, baseDiv.offsetWidth);
      newPosition.y = this.snapToEdge_(newPosition.y, draggingDiv.offsetHeight,
                                       baseDiv.offsetTop, baseDiv.offsetHeight);

      var newCenter = {
        x: newPosition.x + draggingDiv.offsetWidth / 2,
        y: newPosition.y + draggingDiv.offsetHeight / 2
      };

      var baseBounds = {
        x: baseDiv.offsetLeft,
        y: baseDiv.offsetTop,
        width: baseDiv.offsetWidth,
        height: baseDiv.offsetHeight
      };
      switch (getPositionToRectangle(baseBounds, newCenter)) {
        case options.SecondaryDisplayLayout.RIGHT:
          this.layout_ = this.dragging_.display.isPrimary ?
              options.SecondaryDisplayLayout.LEFT :
              options.SecondaryDisplayLayout.RIGHT;
          break;
        case options.SecondaryDisplayLayout.LEFT:
          this.layout_ = this.dragging_.display.isPrimary ?
              options.SecondaryDisplayLayout.RIGHT :
              options.SecondaryDisplayLayout.LEFT;
          break;
        case options.SecondaryDisplayLayout.TOP:
          this.layout_ = this.dragging_.display.isPrimary ?
              options.SecondaryDisplayLayout.BOTTOM :
              options.SecondaryDisplayLayout.TOP;
          break;
        case options.SecondaryDisplayLayout.BOTTOM:
          this.layout_ = this.dragging_.display.isPrimary ?
              options.SecondaryDisplayLayout.TOP :
              options.SecondaryDisplayLayout.BOTTOM;
          break;
      }

      if (this.layout_ == options.SecondaryDisplayLayout.LEFT ||
          this.layout_ == options.SecondaryDisplayLayout.RIGHT) {
        if (newPosition.y > baseDiv.offsetTop + baseDiv.offsetHeight)
          this.layout_ = this.dragging_.display.isPrimary ?
              options.SecondaryDisplayLayout.TOP :
              options.SecondaryDisplayLayout.BOTTOM;
        else if (newPosition.y + draggingDiv.offsetHeight <
                 baseDiv.offsetTop)
          this.layout_ = this.dragging_.display.isPrimary ?
              options.SecondaryDisplayLayout.BOTTOM :
              options.SecondaryDisplayLayout.TOP;
      } else {
        if (newPosition.x > baseDiv.offsetLeft + baseDiv.offsetWidth)
          this.layout_ = this.dragging_.display.isPrimary ?
              options.SecondaryDisplayLayout.LEFT :
              options.SecondaryDisplayLayout.RIGHT;
        else if (newPosition.x + draggingDiv.offsetWidth <
                   baseDiv.offsetLeft)
          this.layout_ = this.dragging_.display.isPrimary ?
              options.SecondaryDisplayLayout.RIGHT :
              options.SecondaryDisplayLayout.LEFT;
      }

      var layoutToBase;
      if (!this.dragging_.display.isPrimary) {
        layoutToBase = this.layout_;
      } else {
        switch (this.layout_) {
          case options.SecondaryDisplayLayout.RIGHT:
            layoutToBase = options.SecondaryDisplayLayout.LEFT;
            break;
          case options.SecondaryDisplayLayout.LEFT:
            layoutToBase = options.SecondaryDisplayLayout.RIGHT;
            break;
          case options.SecondaryDisplayLayout.TOP:
            layoutToBase = options.SecondaryDisplayLayout.BOTTOM;
            break;
          case options.SecondaryDisplayLayout.BOTTOM:
            layoutToBase = options.SecondaryDisplayLayout.TOP;
            break;
        }
      }

      switch (layoutToBase) {
        case options.SecondaryDisplayLayout.RIGHT:
          draggingDiv.style.left =
              baseDiv.offsetLeft + baseDiv.offsetWidth + 'px';
          draggingDiv.style.top = newPosition.y + 'px';
          break;
        case options.SecondaryDisplayLayout.LEFT:
          draggingDiv.style.left =
              baseDiv.offsetLeft - draggingDiv.offsetWidth + 'px';
          draggingDiv.style.top = newPosition.y + 'px';
          break;
        case options.SecondaryDisplayLayout.TOP:
          draggingDiv.style.top =
              baseDiv.offsetTop - draggingDiv.offsetHeight + 'px';
          draggingDiv.style.left = newPosition.x + 'px';
          break;
        case options.SecondaryDisplayLayout.BOTTOM:
          draggingDiv.style.top =
              baseDiv.offsetTop + baseDiv.offsetHeight + 'px';
          draggingDiv.style.left = newPosition.x + 'px';
          break;
      }

      return false;
    },

    /**
     * start dragging of a display rectangle.
     * @param {HTMLElement} target The event target.
     * @param {Object} eventLocation The object to hold the location where
     *     this event happens.
     * @private
     */
    startDragging_: function(target, eventLocation) {
      var oldFocusedIndex = this.focusedIndex_;
      var willUpdateDisplayDescription = false;
      this.focusedIndex_ = null;
      for (var i = 0; i < this.displays_.length; i++) {
        var display = this.displays_[i];
        if (display.div == target ||
            (target.offsetParent && target.offsetParent == display.div)) {
          this.focusedIndex_ = i;
          if (oldFocusedIndex !== null && oldFocusedIndex != i)
            willUpdateDisplayDescription = true;
          break;
        }
      }

      for (var i = 0; i < this.displays_.length; i++) {
        var display = this.displays_[i];
        display.div.className = 'displays-display';
        if (i != this.focusedIndex_)
          continue;

        display.div.classList.add('displays-focused');
        if (this.displays_.length > 1) {
          this.dragging_ = {
            display: display,
            originalLocation: {
              x: display.div.offsetLeft, y: display.div.offsetTop
            },
            eventLocation: eventLocation
          };
        }
      }

      if (willUpdateDisplayDescription)
        this.updateSelectedDisplayDescription_();
      return false;
    },

    /**
     * finish the current dragging of displays.
     * @param {Event} e The event which triggers this.
     * @private
     */
    endDragging_: function(e) {
      this.lastTouchLocation_ = null;
      if (this.dragging_) {
        // Make sure the dragging location is connected.
        var baseDiv = this.dragging_.display.isPrimary ?
            this.secondaryDisplay_.div : this.primaryDisplay_.div;
        var draggingDiv = this.dragging_.display.div;
        if (this.layout_ == options.SecondaryDisplayLayout.LEFT ||
            this.layout_ == options.SecondaryDisplayLayout.RIGHT) {
          var top = Math.max(draggingDiv.offsetTop,
                             baseDiv.offsetTop - draggingDiv.offsetHeight +
                             MIN_OFFSET_OVERLAP);
          top = Math.min(top,
                         baseDiv.offsetTop + baseDiv.offsetHeight -
                         MIN_OFFSET_OVERLAP);
          draggingDiv.style.top = top + 'px';
        } else {
          var left = Math.max(draggingDiv.offsetLeft,
                              baseDiv.offsetLeft - draggingDiv.offsetWidth +
                              MIN_OFFSET_OVERLAP);
          left = Math.min(left,
                          baseDiv.offsetLeft + baseDiv.offsetWidth -
                          MIN_OFFSET_OVERLAP);
          draggingDiv.style.left = left + 'px';
        }
        var originalPosition = this.dragging_.display.originalPosition;
        if (originalPosition.x != draggingDiv.offsetLeft ||
            originalPosition.y != draggingDiv.offsetTop)
          this.applyResult_();
        this.dragging_ = null;
      }
      return false;
    },

    /**
     * Updates the description of selected display section for mirroring mode.
     * @private
     */
    updateSelectedDisplaySectionMirroring_: function() {
      $('display-configuration-arrow').hidden = true;
      $('display-options-set-primary').disabled = true;
      $('display-options-select-mirroring').disabled = false;
      $('selected-display-start-calibrating-overscan').disabled = true;
      var display = this.displays_[0];
      var orientation = $('display-options-orientation-selection');
      orientation.disabled = false;
      var orientationOptions = orientation.getElementsByTagName('option');
      orientationOptions[display.orientation].selected = true;
      $('selected-display-name').textContent =
          loadTimeData.getString('mirroringDisplay');
      var resolution = $('display-options-resolution-selection');
      var option = document.createElement('option');
      option.value = 'default';
      option.textContent = display.width + 'x' + display.height;
      resolution.appendChild(option);
      resolution.disabled = true;
    },

    /**
     * Updates the description of selected display section when no display is
     * selected.
     * @private
     */
    updateSelectedDisplaySectionNoSelected_: function() {
      $('display-configuration-arrow').hidden = true;
      $('display-options-set-primary').disabled = true;
      $('display-options-select-mirroring').disabled = true;
      $('selected-display-start-calibrating-overscan').disabled = true;
      $('display-options-orientation-selection').disabled = true;
      $('selected-display-name').textContent = '';
      var resolution = $('display-options-resolution-selection');
      resolution.appendChild(document.createElement('option'));
      resolution.disabled = true;
    },

    /**
     * Updates the description of selected display section for the selected
     * display.
     * @param {Object} display The selected display object.
     * @private
     */
    updateSelectedDisplaySectionForDisplay_: function(display) {
      var arrow = $('display-configuration-arrow');
      arrow.hidden = false;
      // Adding 1 px to the position to fit the border line and the border in
      // arrow precisely.
      arrow.style.top = $('display-configurations').offsetTop -
          arrow.offsetHeight / 2 + 'px';
      arrow.style.left = display.div.offsetLeft +
          display.div.offsetWidth / 2 - arrow.offsetWidth / 2 + 'px';

      $('display-options-set-primary').disabled = display.isPrimary;
      $('display-options-select-mirroring').disabled =
          (this.displays_.length <= 1 && !this.unifiedDesktopEnabled_);
      $('selected-display-start-calibrating-overscan').disabled =
          display.isInternal;

      var orientation = $('display-options-orientation-selection');
      orientation.disabled = this.unifiedDesktopEnabled_;

      var orientationOptions = orientation.getElementsByTagName('option');
      orientationOptions[display.orientation].selected = true;

      $('selected-display-name').textContent = display.name;

      var resolution = $('display-options-resolution-selection');
      if (display.resolutions.length <= 1) {
        var option = document.createElement('option');
        option.value = 'default';
        option.textContent = display.width + 'x' + display.height;
        option.selected = true;
        resolution.appendChild(option);
        resolution.disabled = true;
      } else {
        var previousOption;
        for (var i = 0; i < display.resolutions.length; i++) {
          var option = document.createElement('option');
          option.value = i;
          option.textContent = display.resolutions[i].width + 'x' +
              display.resolutions[i].height;
          if (display.resolutions[i].isBest) {
            option.textContent += ' ' +
                loadTimeData.getString('annotateBest');
          } else if (display.resolutions[i].isNative) {
            option.textContent += ' ' +
                loadTimeData.getString('annotateNative');
          }
          if (display.resolutions[i].deviceScaleFactor && previousOption &&
              previousOption.textContent == option.textContent) {
            option.textContent +=
                ' (' + display.resolutions[i].deviceScaleFactor + 'x)';
          }
          option.selected = display.resolutions[i].selected;
          resolution.appendChild(option);
          previousOption = option;
        }
        resolution.disabled = (display.resolutions.length <= 1);
      }

      if (display.availableColorProfiles.length <= 1) {
        $('selected-display-color-profile-row').hidden = true;
      } else {
        $('selected-display-color-profile-row').hidden = false;
        var profiles = $('display-options-color-profile-selection');
        profiles.innerHTML = '';
        for (var i = 0; i < display.availableColorProfiles.length; i++) {
          var option = document.createElement('option');
          var colorProfile = display.availableColorProfiles[i];
          option.value = colorProfile.profileId;
          option.textContent = colorProfile.name;
          option.selected = (
              display.colorProfile == colorProfile.profileId);
          profiles.appendChild(option);
        }
      }
    },

    /**
     * Updates the description of the selected display section.
     * @private
     */
    updateSelectedDisplayDescription_: function() {
      var resolution = $('display-options-resolution-selection');
      resolution.textContent = '';
      var orientation = $('display-options-orientation-selection');
      var orientationOptions = orientation.getElementsByTagName('option');
      for (var i = 0; i < orientationOptions.length; i++)
        orientationOptions[i].selected = false;

      if (this.mirroring_) {
        this.updateSelectedDisplaySectionMirroring_();
      } else if (this.focusedIndex_ == null ||
          this.displays_[this.focusedIndex_] == null) {
        this.updateSelectedDisplaySectionNoSelected_();
      } else {
        this.updateSelectedDisplaySectionForDisplay_(
            this.displays_[this.focusedIndex_]);
      }
    },

    /**
     * Clears the drawing area for display rectangles.
     * @private
     */
    resetDisplaysView_: function() {
      var displaysViewHost = $('display-options-displays-view-host');
      displaysViewHost.removeChild(displaysViewHost.firstChild);
      this.displaysView_ = document.createElement('div');
      this.displaysView_.id = 'display-options-displays-view';
      displaysViewHost.appendChild(this.displaysView_);
    },

    /**
     * Lays out the display rectangles for mirroring.
     * @private
     */
    layoutMirroringDisplays_: function() {
      // Offset pixels for secondary display rectangles. The offset includes the
      // border width.
      /** @const */ var MIRRORING_OFFSET_PIXELS = 3;
      // Always show two displays because there must be two displays when
      // the display_options is enabled.  Don't rely on displays_.length because
      // there is only one display from chrome's perspective in mirror mode.
      /** @const */ var MIN_NUM_DISPLAYS = 2;
      /** @const */ var MIRRORING_VERTICAL_MARGIN = 20;

      // The width/height should be same as the first display:
      var width = Math.ceil(this.displays_[0].width * this.visualScale_);
      var height = Math.ceil(this.displays_[0].height * this.visualScale_);

      var numDisplays = Math.max(MIN_NUM_DISPLAYS, this.displays_.length);

      var totalWidth = width + numDisplays * MIRRORING_OFFSET_PIXELS;
      var totalHeight = height + numDisplays * MIRRORING_OFFSET_PIXELS;

      this.displaysView_.style.height = totalHeight + 'px';

      // The displays should be centered.
      var offsetX =
          $('display-options-displays-view').offsetWidth / 2 - totalWidth / 2;

      for (var i = 0; i < numDisplays; i++) {
        var div = document.createElement('div');
        div.className = 'displays-display';
        div.style.top = i * MIRRORING_OFFSET_PIXELS + 'px';
        div.style.left = i * MIRRORING_OFFSET_PIXELS + offsetX + 'px';
        div.style.width = width + 'px';
        div.style.height = height + 'px';
        div.style.zIndex = i;
        // set 'display-mirrored' class for the background display rectangles.
        if (i != numDisplays - 1)
          div.classList.add('display-mirrored');
        this.displaysView_.appendChild(div);
      }
    },

    /**
     * Creates a div element representing the specified display.
     * @param {Object} display The display object.
     * @param {boolean} focused True if it's focused.
     * @private
     */
    createDisplayRectangle_: function(display, focused) {
      var div = document.createElement('div');
      display.div = div;
      div.className = 'displays-display';
      if (focused)
        div.classList.add('displays-focused');

      // div needs to be added to the DOM tree first, otherwise offsetHeight for
      // nameContainer below cannot be computed.
      this.displaysView_.appendChild(div);

      var nameContainer = document.createElement('div');
      nameContainer.textContent = display.name;
      div.appendChild(nameContainer);
      div.style.width = Math.floor(display.width * this.visualScale_) + 'px';
      var newHeight = Math.floor(display.height * this.visualScale_);
      div.style.height = newHeight + 'px';
      nameContainer.style.marginTop =
          (newHeight - nameContainer.offsetHeight) / 2 + 'px';

      div.onmousedown = this.onMouseDown_.bind(this);
      div.ontouchstart = this.onTouchStart_.bind(this);
      return div;
    },

    /**
     * Layouts the display rectangles according to the current layout_.
     * @private
     */
    layoutDisplays_: function() {
      var maxWidth = 0;
      var maxHeight = 0;
      var boundingBox = {left: 0, right: 0, top: 0, bottom: 0};
      this.primaryDisplay_ = null;
      this.secondaryDisplay_ = null;
      var focusedDisplay = null;
      for (var i = 0; i < this.displays_.length; i++) {
        var display = this.displays_[i];
        if (display.isPrimary)
          this.primaryDisplay_ = display;
        else
          this.secondaryDisplay_ = display;
        if (i == this.focusedIndex_)
          focusedDisplay = display;

        boundingBox.left = Math.min(boundingBox.left, display.x);
        boundingBox.right = Math.max(
            boundingBox.right, display.x + display.width);
        boundingBox.top = Math.min(boundingBox.top, display.y);
        boundingBox.bottom = Math.max(
            boundingBox.bottom, display.y + display.height);
        maxWidth = Math.max(maxWidth, display.width);
        maxHeight = Math.max(maxHeight, display.height);
      }
      if (!this.primaryDisplay_)
        return;

      // Make the margin around the bounding box.
      var areaWidth = boundingBox.right - boundingBox.left + maxWidth;
      var areaHeight = boundingBox.bottom - boundingBox.top + maxHeight;

      // Calculates the scale by the width since horizontal size is more strict.
      // TODO(mukai): Adds the check of vertical size in case.
      this.visualScale_ = Math.min(
          VISUAL_SCALE, this.displaysView_.offsetWidth / areaWidth);

      // Prepare enough area for thisplays_view by adding the maximum height.
      this.displaysView_.style.height =
          Math.ceil(areaHeight * this.visualScale_) + 'px';

      // Centering the bounding box of the display rectangles.
      var offset = {
        x: Math.floor(this.displaysView_.offsetWidth / 2 -
            (boundingBox.right + boundingBox.left) * this.visualScale_ / 2),
        y: Math.floor(this.displaysView_.offsetHeight / 2 -
            (boundingBox.bottom + boundingBox.top) * this.visualScale_ / 2)
      };

      // Layouting the display rectangles. First layout the primaryDisplay and
      // then layout the secondary which is attaching to the primary.
      var primaryDiv = this.createDisplayRectangle_(
          this.primaryDisplay_, this.primaryDisplay_ == focusedDisplay);
      primaryDiv.style.left =
          Math.floor(this.primaryDisplay_.x * this.visualScale_) +
              offset.x + 'px';
      primaryDiv.style.top =
          Math.floor(this.primaryDisplay_.y * this.visualScale_) +
              offset.y + 'px';
      this.primaryDisplay_.originalPosition = {
        x: primaryDiv.offsetLeft, y: primaryDiv.offsetTop};

      if (this.secondaryDisplay_) {
        var secondaryDiv = this.createDisplayRectangle_(
            this.secondaryDisplay_, this.secondaryDisplay_ == focusedDisplay);
        // Don't trust the secondary display's x or y, because it may cause a
        // 1px gap due to rounding, which will create a fake update on end
        // dragging. See crbug.com/386401
        switch (this.layout_) {
        case options.SecondaryDisplayLayout.TOP:
          secondaryDiv.style.left =
              Math.floor(this.secondaryDisplay_.x * this.visualScale_) +
              offset.x + 'px';
          secondaryDiv.style.top =
              primaryDiv.offsetTop - secondaryDiv.offsetHeight + 'px';
          break;
        case options.SecondaryDisplayLayout.RIGHT:
          secondaryDiv.style.left =
              primaryDiv.offsetLeft + primaryDiv.offsetWidth + 'px';
          secondaryDiv.style.top =
              Math.floor(this.secondaryDisplay_.y * this.visualScale_) +
              offset.y + 'px';
          break;
        case options.SecondaryDisplayLayout.BOTTOM:
          secondaryDiv.style.left =
              Math.floor(this.secondaryDisplay_.x * this.visualScale_) +
              offset.x + 'px';
          secondaryDiv.style.top =
              primaryDiv.offsetTop + primaryDiv.offsetHeight + 'px';
          break;
        case options.SecondaryDisplayLayout.LEFT:
          secondaryDiv.style.left =
              primaryDiv.offsetLeft - secondaryDiv.offsetWidth + 'px';
          secondaryDiv.style.top =
              Math.floor(this.secondaryDisplay_.y * this.visualScale_) +
              offset.y + 'px';
          break;
        }
        this.secondaryDisplay_.originalPosition = {
          x: secondaryDiv.offsetLeft, y: secondaryDiv.offsetTop};
      }
    },

    /**
     * Called when the display arrangement has changed.
     * @param {options.MultiDisplayMode} mode multi display mode.
     * @param {Array<options.DisplayInfo>} displays The list of the display
     *     information.
     * @param {options.SecondaryDisplayLayout} layout The layout strategy.
     * @param {number} offset The offset of the secondary display.
     * @private
     */
    onDisplayChanged_: function(mode, displays, layout, offset) {
      if (!this.visible)
        return;

      var hasExternal = false;
      for (var i = 0; i < displays.length; i++) {
        if (!displays[i].isInternal) {
          hasExternal = true;
          break;
        }
      }

      this.layout_ = layout;

      var mirroring = mode == options.MultiDisplayMode.MIRRORING;
      var unifiedDesktopEnabled = mode == options.MultiDisplayMode.UNIFIED;

      // Focus to the first display next to the primary one when |displays| list
      // is updated.
      if (mirroring) {
        this.focusedIndex_ = null;
      } else if (this.mirroring_ != mirroring ||
                 this.unifiedDesktopEnabled_ != unifiedDesktopEnabled ||
                 this.displays_.length != displays.length) {
        this.focusedIndex_ = 0;
      }

      this.mirroring_ = mirroring;
      this.unifiedDesktopEnabled_ = unifiedDesktopEnabled;
      this.displays_ = displays;

      this.resetDisplaysView_();
      if (this.mirroring_)
        this.layoutMirroringDisplays_();
      else
        this.layoutDisplays_();

      $('display-options-select-mirroring').value =
          mirroring ? 'mirroring' : 'extended';

      $('display-options-unified-desktop').hidden =
          !this.showUnifiedDesktopOption_;

      $('display-options-toggle-unified-desktop').checked =
          this.unifiedDesktopEnabled_;

      var disableUnifiedDesktopOption =
           (this.mirroring_ ||
            (!this.unifiedDesktopEnabled_ &&
              this.displays_.length == 1));

      $('display-options-toggle-unified-desktop').disabled =
          disableUnifiedDesktopOption;

      this.updateSelectedDisplayDescription_();
    }
  };

  DisplayOptions.setDisplayInfo = function(
      mode, displays, layout, offset) {
    DisplayOptions.getInstance().onDisplayChanged_(
        mode, displays, layout, offset);
  };

  // Export
  return {
    DisplayOptions: DisplayOptions
  };
});

// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  var Page = cr.ui.pageManager.Page;
  var PageManager = cr.ui.pageManager.PageManager;

  /**
   * Encapsulated handling of the 'DisplayOverscan' page.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function DisplayOverscan() {
    Page.call(this, 'displayOverscan',
              loadTimeData.getString('displayOverscanPageTabTitle'),
              'display-overscan-page');
  }

  cr.addSingletonGetter(DisplayOverscan);

  DisplayOverscan.prototype = {
    __proto__: Page.prototype,

    /**
     * The ID of the target display.
     * @private {?string}
     */
    id_: null,

    /**
     * The keyboard event handler function.
     * @private
     */
    keyHandler_: null,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      this.keyHandler_ = this.handleKeyevent_.bind(this);
      $('display-overscan-operation-reset').onclick = function() {
        chrome.send('reset');
      };
      $('display-overscan-operation-ok').onclick = function() {
        chrome.send('commit');
        PageManager.closeOverlay();
      };
      $('display-overscan-operation-cancel').onclick = function() {
        PageManager.cancelOverlay();
      };
    },

    /** @override */
    handleCancel: function() {
      // signals the cancel event.
      chrome.send('cancel');
      PageManager.closeOverlay();
    },

    /** @override */
    didShowPage: function() {
      if (this.id_ == null) {
        PageManager.cancelOverlay();
        return;
      }

      window.addEventListener('keydown', this.keyHandler_);
      // Sets up the size of the overscan dialog based on DisplayOptions dialog.
      var displayOptionsPage = $('display-options-page');
      var displayOverscanPage = $('display-overscan-page');
      displayOverscanPage.style.width =
          displayOptionsPage.offsetWidth - 20 + 'px';
      displayOverscanPage.style.minWidth = displayOverscanPage.style.width;
      displayOverscanPage.style.height =
          displayOptionsPage.offsetHeight - 50 + 'px';

      // Moves the table to describe operation at the middle of the contents
      // vertically.
      var operationsTable = $('display-overscan-operations-table');
      var buttonsContainer = $('display-overscan-button-strip');
      operationsTable.style.top = buttonsContainer.offsetTop / 2 -
          operationsTable.offsetHeight / 2 + 'px';

      $('display-overscan-operation-cancel').focus();
      chrome.send('start', [this.id_]);
    },

    /** @override */
    didClosePage: function() {
      window.removeEventListener('keydown', this.keyHandler_);
    },

    /**
     * Called when the overscan calibration is canceled at the system level,
     * such like the display is disconnected.
     * @private
     */
    onOverscanCanceled_: function() {
      if (PageManager.getTopmostVisiblePage() == this)
        PageManager.cancelOverlay();
    },

    /**
     * Sets the target display id. This method has to be called before
     * navigating to this page.
     * @param {string} id The target display id.
     */
    setDisplayId: function(id) {
      this.id_ = id;
    },

    /**
     * Key event handler to make the effect of display rectangle.
     * @param {Event} event The keyboard event.
     * @private
     */
    handleKeyevent_: function(event) {
      switch (event.keyCode) {
        case 37: // left arrow
          if (event.shiftKey)
            chrome.send('move', ['horizontal', -1]);
          else
            chrome.send('resize', ['horizontal', -1]);
          event.preventDefault();
          break;
        case 38: // up arrow
          if (event.shiftKey)
            chrome.send('move', ['vertical', -1]);
          else
            chrome.send('resize', ['vertical', -1]);
          event.preventDefault();
          break;
        case 39: // right arrow
          if (event.shiftKey)
            chrome.send('move', ['horizontal', 1]);
          else
            chrome.send('resize', ['horizontal', 1]);
          event.preventDefault();
          break;
        case 40: // bottom arrow
          if (event.shiftKey)
            chrome.send('move', ['vertical', 1]);
          else
            chrome.send('resize', ['vertical', 1]);
          event.preventDefault();
          break;
      }
    }
  };

  DisplayOverscan.onOverscanCanceled = function() {
    DisplayOverscan.getInstance().onOverscanCanceled_();
  };

  // Export
  return {
    DisplayOverscan: DisplayOverscan
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {

  /**
   * Auto-repeat delays (in ms) for the corresponding slider values, from
   * long to short. The values were chosen to provide a large range while giving
   * several options near the defaults.
   * @type {!Array<number>}
   * @const
   */
  var AUTO_REPEAT_DELAYS =
      [2000, 1500, 1000, 500, 300, 200, 150];

  /**
   * Auto-repeat intervals (in ms) for the corresponding slider values, from
   * long to short. The slider itself is labeled "rate", the inverse of
   * interval, and goes from slow (long interval) to fast (short interval).
   * @type {!Array<number>}
   * @const
   */
  var AUTO_REPEAT_INTERVALS =
      [2000, 1000, 500, 300, 200, 100, 50, 30, 20];

  /**
   * Encapsulated handling of the keyboard overlay.
   * @constructor
   * @extends {options.SettingsDialog}
   */
  function KeyboardOverlay() {
    options.SettingsDialog.call(this, 'keyboard-overlay',
        loadTimeData.getString('keyboardOverlayTabTitle'),
        'keyboard-overlay',
        assertInstanceof($('keyboard-confirm'), HTMLButtonElement),
        assertInstanceof($('keyboard-cancel'), HTMLButtonElement));
  }

  cr.addSingletonGetter(KeyboardOverlay);

  KeyboardOverlay.prototype = {
    __proto__: options.SettingsDialog.prototype,

    /** @override */
    initializePage: function() {
      options.SettingsDialog.prototype.initializePage.call(this);

      $('enable-auto-repeat').customPrefChangeHandler =
          this.handleAutoRepeatEnabledPrefChange_.bind(this);

      var autoRepeatDelayRange = $('auto-repeat-delay-range');
      autoRepeatDelayRange.valueMap = AUTO_REPEAT_DELAYS;
      autoRepeatDelayRange.max = AUTO_REPEAT_DELAYS.length - 1;
      autoRepeatDelayRange.customPrefChangeHandler =
          this.handleAutoRepeatDelayPrefChange_.bind(this);

      var autoRepeatIntervalRange = $('auto-repeat-interval-range');
      autoRepeatIntervalRange.valueMap = AUTO_REPEAT_INTERVALS;
      autoRepeatIntervalRange.max = AUTO_REPEAT_INTERVALS.length - 1;
      autoRepeatIntervalRange.customPrefChangeHandler =
          this.handleAutoRepeatIntervalPrefChange_.bind(this);

      $('languages-and-input-settings').onclick = function(e) {
        PageManager.showPageByName('languages');
        chrome.send('coreOptionsUserMetricsAction',
                    ['Options_KeyboardShowLanguageSettings']);
      };

      $('keyboard-shortcuts').onclick = function(e) {
        chrome.send('showKeyboardShortcuts');
        chrome.send('coreOptionsUserMetricsAction',
                    ['Options_KeyboardShowKeyboardShortcuts']);
      };
    },

    /**
     * Handles auto-repeat enabled pref change and allows the event to continue
     * propagating.
     * @param {Event} e Change event.
     * @return {boolean} Whether the event has finished being handled.
     * @private
     */
    handleAutoRepeatEnabledPrefChange_: function(e) {
      $('auto-repeat-settings-section').classList.toggle('disabled',
                                                         !e.value.value);
      $('auto-repeat-delay-range').disabled =
          $('auto-repeat-interval-range').disabled = !e.value.value;
      return false;
    },

    /**
     * Handles auto-repeat delay pref change and stops the event from
     * propagating.
     * @param {Event} e Change event.
     * @return {boolean} Whether the event has finished being handled.
     * @private
     */
    handleAutoRepeatDelayPrefChange_: function(e) {
      this.updateSliderFromValue_('auto-repeat-delay-range',
                                  e.value.value,
                                  AUTO_REPEAT_DELAYS);
      return true;
    },

    /**
     * Handles auto-repeat interval pref change and stops the event from
     * propagating.
     * @param {Event} e Change event.
     * @return {boolean} Whether the event has finished being handled.
     * @private
     */
    handleAutoRepeatIntervalPrefChange_: function(e) {
      this.updateSliderFromValue_('auto-repeat-interval-range',
                                  e.value.value,
                                  AUTO_REPEAT_INTERVALS);
      return true;
    },

    /**
     * Show/hide the caps lock remapping section.
     * @private
     */
    showCapsLockOptions_: function(show) {
      $('caps-lock-remapping-section').hidden = !show;
    },

    /**
     * Show/hide the diamond key remapping section.
     * @private
     */
    showDiamondKeyOptions_: function(show) {
      $('diamond-key-remapping-section').hidden = !show;
    },

    /**
     * Sets the slider's value to the number in |values| that is closest to
     * |value|.
     * @param {string} id The slider's ID.
     * @param {number} value The value to find.
     * @param {!Array<number>} values The array to search.
     * @private
     */
    updateSliderFromValue_: function(id, value, values) {
      var index = values.indexOf(value);
      if (index == -1) {
        var closestValue = Infinity;
        for (var i = 0; i < values.length; i++) {
          if (Math.abs(values[i] - value) <
              Math.abs(closestValue - value)) {
            closestValue = values[i];
            index = i;
          }
        }

        assert(index != -1,
               'Failed to update ' + id + ' from pref with value ' + value);
      }

      $(id).value = index;
    },
  };

  // Forward public APIs to private implementations.
  cr.makePublic(KeyboardOverlay, [
    'showCapsLockOptions',
    'showDiamondKeyOptions',
  ]);

  // Export
  return {
    KeyboardOverlay: KeyboardOverlay
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /** @const */ var SettingsDialog = options.SettingsDialog;

  /**
   * PointerOverlay class
   * Dialog that allows users to set pointer settings (touchpad/mouse).
   * @constructor
   * @extends {options.SettingsDialog}
   */
  function PointerOverlay() {
    // The title is updated dynamically in the setTitle method as pointer
    // devices are discovered or removed.
    SettingsDialog.call(this, 'pointer-overlay',
        '', 'pointer-overlay',
        assertInstanceof($('pointer-overlay-confirm'), HTMLButtonElement),
        assertInstanceof($('pointer-overlay-cancel'), HTMLButtonElement));
  }

  cr.addSingletonGetter(PointerOverlay);

  PointerOverlay.prototype = {
    __proto__: SettingsDialog.prototype,
  };

  /**
   * Sets the visibility state of the touchpad group.
   * @param {boolean} show True to show, false to hide.
   */
  PointerOverlay.showTouchpadControls = function(show) {
    $('pointer-section-touchpad').hidden = !show;
  };

  /**
   * Sets the visibility state of the mouse group.
   * @param {boolean} show True to show, false to hide.
   */
  PointerOverlay.showMouseControls = function(show) {
    $('pointer-section-mouse').hidden = !show;
  };

  /**
   * Updates the title of the pointer dialog.  The title is set dynamically
   * based on whether a touchpad, mouse or both are present.  The label on the
   * button that activates the overlay is also updated to stay in sync. A
   * message is displayed in the main settings page if no pointer devices are
   * available.
   * @param {string} label i18n key for the overlay title.
   */
  PointerOverlay.setTitle = function(label) {
    var button = $('pointer-settings-button');
    var noPointersLabel = $('no-pointing-devices');
    if (label.length > 0) {
      var title = loadTimeData.getString(label);
      button.textContent = title;
      button.hidden = false;
      noPointersLabel.hidden = true;
    } else {
      button.hidden = true;
      noPointersLabel.hidden = false;
    }
  };

  // Export
  return {
    PointerOverlay: PointerOverlay
  };
});

// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /** @const */ var PageManager = cr.ui.pageManager.PageManager;
  /** @const */ var SettingsDialog = options.SettingsDialog;

  /**
   * HomePageOverlay class
   * Dialog that allows users to set the home page.
   * @constructor
   * @extends {options.SettingsDialog}
   */
  function ThirdPartyImeConfirmOverlay() {
    SettingsDialog.call(
        this, 'thirdPartyImeConfirm',
        loadTimeData.getString('thirdPartyImeConfirmOverlayTabTitle'),
        'third-party-ime-confirm-overlay',
        assertInstanceof($('third-party-ime-confirm-ok'), HTMLButtonElement),
        assertInstanceof($('third-party-ime-confirm-cancel'),
                         HTMLButtonElement));
  }

  cr.addSingletonGetter(ThirdPartyImeConfirmOverlay);

  ThirdPartyImeConfirmOverlay.prototype = {
    __proto__: SettingsDialog.prototype,

   /**
    * Callback to authorize use of an input method.
    * @type {Function}
    * @private
    */
   confirmationCallback_: null,

   /**
    * Callback to cancel enabling an input method.
    * @type {Function}
    * @private
    */
   cancellationCallback_: null,

    /**
     * Confirms enabling of a third party IME.
     */
    handleConfirm: function() {
      SettingsDialog.prototype.handleConfirm.call(this);
      this.confirmationCallback_();
    },

    /**
     * Resets state of the checkobx.
     */
    handleCancel: function() {
      SettingsDialog.prototype.handleCancel.call(this);
      this.cancellationCallback_();
    },

    /**
     * Displays a confirmation dialog indicating the risk fo enabling
     * a third party IME.
     * @param {{extension: string, confirm: Function, cancel: Function}} data
     *     Options for the confirmation dialog.
     * @private
     */
    showConfirmationDialog_: function(data) {
      this.confirmationCallback_ = data.confirm;
      this.cancellationCallback_ = data.cancel;
      var message = loadTimeData.getStringF('thirdPartyImeConfirmMessage',
                                             data.extension);
      $('third-party-ime-confirm-text').textContent = message;
      PageManager.showPageByName(this.name, false);
    },
  };

  /**
   * Displays a confirmation dialog indicating the risk fo enabling
   * a third party IME.
   * @param {{extension: string, confirm: Function, cancel: Function}} data
   *     Options for the confirmation dialog.
   */
  ThirdPartyImeConfirmOverlay.showConfirmationDialog = function(data) {
    ThirdPartyImeConfirmOverlay.getInstance().showConfirmationDialog_(data);
  };

  // Export
  return {
    ThirdPartyImeConfirmOverlay: ThirdPartyImeConfirmOverlay
  };
});

// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.exportPath('options');

/**
 * Copied from ash/system/chromeos/power/power_status.h.
 * @enum {number}
 */
options.PowerStatusDeviceType = {
  DEDICATED_CHARGER: 0,
  DUAL_ROLE_USB: 1,
};

/**
 * @typedef {{
 *   id: string,
 *   type: options.PowerStatusDeviceType,
 *   description: string
 * }}
 */
options.PowerSource;

cr.define('options', function() {
  var Page = cr.ui.pageManager.Page;
  var PageManager = cr.ui.pageManager.PageManager;

  /**
   * Encapsulated handling of the power overlay.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function PowerOverlay() {
    Page.call(this, 'power-overlay',
              loadTimeData.getString('powerOverlayTabTitle'),
              'power-overlay');
  }

  cr.addSingletonGetter(PowerOverlay);

  PowerOverlay.prototype = {
    __proto__: Page.prototype,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      $('power-confirm').onclick =
          PageManager.closeOverlay.bind(PageManager);
      $('power-source-dropdown').onchange =
          this.powerSourceChanged_.bind(this);
    },

    /** @override */
    didShowPage: function() {
      chrome.send('updatePowerStatus');
    },

    /**
     * @param {string} status
     * @private
     */
    setBatteryStatusText_: function(status) {
      $('battery-status-value').textContent = status;
    },

    /**
     * @param {Array<options.PowerSource>} sources External power sources.
     * @param {string} selectedId The ID of the currently used power source.
     * @param {boolean} isUsbCharger Whether the currently used power source
     *     is a USB (low-powered) charger.
     * @param {boolean} isCalculating Whether the power info is still
     *     being calculated.
     * @private
     */
    setPowerSources_: function(sources, selectedId, isUsbCharger,
                               isCalculating) {
      if (this.lastPowerSource_ != selectedId) {
        this.lastPowerSource_ = selectedId;
        if (selectedId && !isUsbCharger) {
          // It can take a while to detect a USB charger, but triggering a
          // power status update makes the determination faster.
          setTimeout(chrome.send.bind(null, 'updatePowerStatus'), 1000);
        }
      }

      var chargerRow = $('power-source-charger');

      $('power-sources').hidden = chargerRow.hidden = true;

      // If no power sources are available, only show the battery status text.
      if (sources.length == 0)
        return;

      // If we're still calculating battery time and seem to have an AC
      // adapter, the charger information may be wrong.
      if (isCalculating && selectedId && !isUsbCharger) {
        $('power-source-charger-type').textContent =
            loadTimeData.getString('calculatingPower');
        chargerRow.hidden = false;
        return;
      }

      // Check if a dedicated charger is being used.
      var usingDedicatedCharger = false;
      if (selectedId) {
        usingDedicatedCharger = sources.some(function(source) {
          return source.id == selectedId &&
              source.type == options.PowerStatusDeviceType.DEDICATED_CHARGER;
        });
      }

      if (usingDedicatedCharger) {
        // Show charger information.
        $('power-source-charger-type').textContent = loadTimeData.getString(
            isUsbCharger ? 'powerSourceLowPowerCharger' :
                           'powerSourceAcAdapter');
        chargerRow.hidden = false;
      } else {
        this.showPowerSourceList_(sources, selectedId);
      }
    },

    /**
     * Populates and shows the dropdown of available power sources.
     * @param {Array<options.PowerSource>} sources External power sources.
     * @param {string} selectedId The ID of the currently used power source.
     *     The empty string indicates no external power source is in use
     *     (running on battery).
     * @private
     */
    showPowerSourceList_: function(sources, selectedId) {
      // Clear the dropdown.
      var dropdown = $('power-source-dropdown');
      dropdown.innerHTML = '';

      // Add a battery option.
      sources.unshift({
        id: '',
        description: loadTimeData.getString('powerSourceBattery'),
      });

      // Build the power source list.
      sources.forEach(function(source) {
        var option = document.createElement('option');
        option.value = source.id;
        option.textContent = source.description;
        option.selected = source.id == selectedId;
        dropdown.appendChild(option);
      });

      // Show the power source list.
      $('power-sources').hidden = false;
    },

    /** @private */
    powerSourceChanged_: function() {
      chrome.send('setPowerSource', [$('power-source-dropdown').value]);
    },
  };

  cr.makePublic(PowerOverlay, [
      'setBatteryStatusText',
      'setPowerSources',
  ]);

  // Export
  return {
    PowerOverlay: PowerOverlay
  };
});

var AccountsOptions = options.AccountsOptions;
var ChangePictureOptions = options.ChangePictureOptions;
var ConsumerManagementOverlay = options.ConsumerManagementOverlay;
var DetailsInternetPage = options.internet.DetailsInternetPage;
var DisplayOptions = options.DisplayOptions;
var DisplayOverscan = options.DisplayOverscan;
var BluetoothOptions = options.BluetoothOptions;
var BluetoothPairing = options.BluetoothPairing;
var KeyboardOverlay = options.KeyboardOverlay;
var PointerOverlay = options.PointerOverlay;
var PowerOverlay = options.PowerOverlay;
var UIAccountTweaks = uiAccountTweaks.UIAccountTweaks;
// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   subnodes: Array<{id: string, name: string, readonly: boolean,
 *                     untrusted: boolean, extractable: boolean,
 *                     policy: boolean}>
 * }}
 */
var CertificateData;

cr.define('options', function() {
  /** @const */ var Tree = cr.ui.Tree;
  /** @const */ var TreeItem = cr.ui.TreeItem;

  /**
   * Creates a new tree folder for certificate data.
   * @param {Object=} data Data used to create a certificate tree folder.
   * @constructor
   * @extends {TreeItem}
   */
  function CertificateTreeFolder(data) {
    data.isCert = false;
    var treeFolder = new TreeItem({
      label: data.name,
      data: data
    });
    treeFolder.__proto__ = CertificateTreeFolder.prototype;

    if (data.icon)
      treeFolder.icon = data.icon;

    return treeFolder;
  }

  CertificateTreeFolder.prototype = {
    __proto__: TreeItem.prototype,

    /**
     * The tree path id/.
     * @type {string}
     */
    get pathId() {
      return this.data.id;
    }
  };

  /**
   * Creates a new tree item for certificate data.
   * @param {Object=} data Data used to create a certificate tree item.
   * @constructor
   * @extends {TreeItem}
   */
  function CertificateTreeItem(data) {
    data.isCert = true;
    // TODO(mattm): other columns
    var treeItem = new TreeItem({
      label: data.name,
      data: data
    });
    treeItem.__proto__ = CertificateTreeItem.prototype;

    if (data.icon)
      treeItem.icon = data.icon;

    if (data.untrusted) {
      var badge = document.createElement('span');
      badge.classList.add('cert-untrusted');
      badge.textContent = loadTimeData.getString('badgeCertUntrusted');
      treeItem.labelElement.insertBefore(
          badge, treeItem.labelElement.firstChild);
    }

    if (data.policy) {
      var policyIndicator = new options.ControlledSettingIndicator();
      policyIndicator.controlledBy = 'policy';
      policyIndicator.setAttribute(
          'textpolicy', loadTimeData.getString('certPolicyInstalled'));
      policyIndicator.classList.add('cert-policy');
      treeItem.labelElement.appendChild(policyIndicator);
    }

    return treeItem;
  }

  CertificateTreeItem.prototype = {
    __proto__: TreeItem.prototype,

    /**
     * The tree path id/.
     * @type {string}
     */
    get pathId() {
      return this.parentItem.pathId + ',' + this.data.id;
    }
  };

  /**
   * Creates a new cookies tree.
   * @param {Object=} opt_propertyBag Optional properties.
   * @constructor
   * @extends {Tree}
   */
  var CertificatesTree = cr.ui.define('tree');

  CertificatesTree.prototype = {
    __proto__: Tree.prototype,

    /** @override */
    decorate: function() {
      Tree.prototype.decorate.call(this);
      this.treeLookup_ = {};
    },

    /** @override */
    addAt: function(child, index) {
      Tree.prototype.addAt.call(this, child, index);
      if (child.data && child.data.id)
        this.treeLookup_[child.data.id] = child;
    },

    /** @override */
    remove: function(child) {
      Tree.prototype.remove.call(this, child);
      if (child.data && child.data.id)
        delete this.treeLookup_[child.data.id];
    },

    /**
     * Clears the tree.
     */
    clear: function() {
      // Remove all fields without recreating the object since other code
      // references it.
      for (var id in this.treeLookup_)
        delete this.treeLookup_[id];
      this.textContent = '';
    },

    /**
     * Populate the tree.
     * @param {Array<CertificateData>} nodesData Nodes data array.
     */
    populate: function(nodesData) {
      this.clear();

      for (var i = 0; i < nodesData.length; ++i) {
        var subnodes = nodesData[i].subnodes;
        delete nodesData[i].subnodes;

        var item = new CertificateTreeFolder(nodesData[i]);
        this.addAt(item, i);

        for (var j = 0; j < subnodes.length; ++j) {
          var subitem = new CertificateTreeItem(subnodes[j]);
          item.addAt(subitem, j);
        }
        // Make tree expanded by default.
        item.expanded = true;
      }

      cr.dispatchSimpleEvent(this, 'change');
    },
  };

  return {
    CertificatesTree: CertificatesTree
  };
});


// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  var OptionsPage = options.OptionsPage;
  var Page = cr.ui.pageManager.Page;
  var PageManager = cr.ui.pageManager.PageManager;

  /////////////////////////////////////////////////////////////////////////////
  // CertificateManagerTab class:

  /**
   * blah
   * @param {!string} id The id of this tab.
   * @param {boolean} isKiosk True if dialog is shown during CrOS kiosk launch.
   * @constructor
   */
  function CertificateManagerTab(id, isKiosk) {
    this.tree = $(id + '-tree');

    options.CertificatesTree.decorate(this.tree);
    this.tree.addEventListener('change',
        this.handleCertificatesTreeChange_.bind(this));

    var tree = this.tree;

    this.viewButton = $(id + '-view');
    this.viewButton.onclick = function(e) {
      var selected = tree.selectedItem;
      chrome.send('viewCertificate', [selected.data.id]);
    };

    this.editButton = $(id + '-edit');
    if (this.editButton !== null) {
      if (id == 'serverCertsTab') {
        this.editButton.onclick = function(e) {
          var selected = tree.selectedItem;
          chrome.send('editServerCertificate', [selected.data.id]);
        };
      } else if (id == 'caCertsTab') {
        this.editButton.onclick = function(e) {
          var data = tree.selectedItem.data;
          CertificateEditCaTrustOverlay.show(data.id, data.name);
        };
      }
    }

    this.backupButton = $(id + '-backup');
    if (this.backupButton !== null) {
      if (id == 'personalCertsTab' && isKiosk) {
        this.backupButton.hidden = true;
      } else {
        this.backupButton.onclick = function(e) {
          var selected = tree.selectedItem;
          chrome.send('exportPersonalCertificate', [selected.data.id]);
        };
      }
    }

    this.backupAllButton = $(id + '-backup-all');
    if (this.backupAllButton !== null) {
      if (id == 'personalCertsTab' && isKiosk) {
        this.backupAllButton.hidden = true;
      } else {
        this.backupAllButton.onclick = function(e) {
          chrome.send('exportAllPersonalCertificates');
        };
      }
    }

    this.importButton = $(id + '-import');
    if (this.importButton !== null) {
      if (id == 'personalCertsTab') {
        if (isKiosk) {
          this.importButton.hidden = true;
        } else {
          this.importButton.onclick = function(e) {
            chrome.send('importPersonalCertificate', [false]);
          };
        }
      } else if (id == 'serverCertsTab') {
        this.importButton.onclick = function(e) {
          chrome.send('importServerCertificate');
        };
      } else if (id == 'caCertsTab') {
        this.importButton.onclick = function(e) {
          chrome.send('importCaCertificate');
        };
      }
    }

    this.importAndBindButton = $(id + '-import-and-bind');
    if (this.importAndBindButton !== null) {
      if (id == 'personalCertsTab') {
        this.importAndBindButton.onclick = function(e) {
          chrome.send('importPersonalCertificate', [true]);
        };
      }
    }

    this.exportButton = $(id + '-export');
    if (this.exportButton !== null) {
      if (id == 'personalCertsTab' && isKiosk) {
        this.exportButton.hidden = true;
      } else {
        this.exportButton.onclick = function(e) {
          var selected = tree.selectedItem;
          chrome.send('exportCertificate', [selected.data.id]);
        };
      }
    }

    this.deleteButton = $(id + '-delete');
    this.deleteButton.onclick = function(e) {
      var data = tree.selectedItem.data;
      AlertOverlay.show(
          loadTimeData.getStringF(id + 'DeleteConfirm', data.name),
          loadTimeData.getString(id + 'DeleteImpact'),
          loadTimeData.getString('ok'),
          loadTimeData.getString('cancel'),
          function() {
            tree.selectedItem = null;
            chrome.send('deleteCertificate', [data.id]);
          });
    };
  }

  CertificateManagerTab.prototype = {
    /**
     * Update button state.
     * @private
     * @param {!Object} data The data of the selected item.
     */
    updateButtonState: function(data) {
      var isCert = !!data && data.isCert;
      var readOnly = !!data && data.readonly;
      var extractable = !!data && data.extractable;
      var hasChildren = this.tree.items.length > 0;
      var isPolicy = !!data && data.policy;
      this.viewButton.disabled = !isCert;
      if (this.editButton !== null)
        this.editButton.disabled = !isCert || isPolicy;
      if (this.backupButton !== null)
        this.backupButton.disabled = !isCert || !extractable;
      if (this.backupAllButton !== null)
        this.backupAllButton.disabled = !hasChildren;
      if (this.exportButton !== null)
        this.exportButton.disabled = !isCert;
      this.deleteButton.disabled = !isCert || readOnly || isPolicy;
    },

    /**
     * Handles certificate tree selection change.
     * @private
     * @param {!Event} e The change event object.
     */
    handleCertificatesTreeChange_: function(e) {
      var data = null;
      if (this.tree.selectedItem)
        data = this.tree.selectedItem.data;

      this.updateButtonState(data);
    },
  };

  /////////////////////////////////////////////////////////////////////////////
  // CertificateManager class:

  /**
   * Encapsulated handling of ChromeOS accounts options page.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function CertificateManager() {
    Page.call(this, 'certificates',
              loadTimeData.getString('certificateManagerPageTabTitle'),
              'certificateManagerPage');
  }

  cr.addSingletonGetter(CertificateManager);

  CertificateManager.prototype = {
    __proto__: Page.prototype,

    /** @private {boolean} */
    isKiosk_: false,

    /** @param {boolean} isKiosk */
    setIsKiosk: function(isKiosk) {
      this.isKiosk_ = isKiosk;
    },

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      this.personalTab = new CertificateManagerTab('personalCertsTab',
                                                   this.isKiosk_);
      this.serverTab = new CertificateManagerTab('serverCertsTab',
                                                 this.isKiosk_);
      this.caTab = new CertificateManagerTab('caCertsTab', this.isKiosk_);
      this.otherTab = new CertificateManagerTab('otherCertsTab', this.isKiosk_);

      this.addEventListener('visibleChange', this.handleVisibleChange_);

      $('certificate-confirm').onclick = function() {
        PageManager.closeOverlay();
      };
    },

    initalized_: false,

    /**
     * Handler for Page's visible property change event.
     * @private
     * @param {Event} e Property change event.
     */
    handleVisibleChange_: function(e) {
      if (!this.initalized_ && this.visible) {
        this.initalized_ = true;
        OptionsPage.showTab($('personal-certs-nav-tab'));
        chrome.send('populateCertificateManager');
      }
    }
  };

  // CertificateManagerHandler callbacks.
  CertificateManager.onPopulateTree = function(args) {
    $(args[0]).populate(args[1]);
  };

  CertificateManager.exportPersonalAskPassword = function(args) {
    CertificateBackupOverlay.show();
  };

  CertificateManager.importPersonalAskPassword = function(args) {
    CertificateRestoreOverlay.show();
  };

  CertificateManager.onModelReady = function(userDbAvailable,
                                             tpmAvailable) {
    if (!userDbAvailable)
      return;
    if (tpmAvailable)
      $('personalCertsTab-import-and-bind').disabled = false;
    $('personalCertsTab-import').disabled = false;
    $('serverCertsTab-import').disabled = false;
    $('caCertsTab-import').disabled = false;
  };

  // Export
  return {
    CertificateManagerTab: CertificateManagerTab,
    CertificateManager: CertificateManager
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /** @const */ var Page = cr.ui.pageManager.Page;
  /** @const */ var PageManager = cr.ui.pageManager.PageManager;

  /**
   * CertificateRestoreOverlay class
   * Encapsulated handling of the 'enter restore password' overlay page.
   * @class
   */
  function CertificateRestoreOverlay() {
    Page.call(this, 'certificateRestore', '', 'certificateRestoreOverlay');
  }

  cr.addSingletonGetter(CertificateRestoreOverlay);

  CertificateRestoreOverlay.prototype = {
    __proto__: Page.prototype,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      var self = this;
      $('certificateRestoreCancelButton').onclick = function(event) {
        self.cancelRestore_();
      };
      $('certificateRestoreOkButton').onclick = function(event) {
        self.finishRestore_();
      };

      self.clearInputFields_();
    },

    /** @override */
    didShowPage: function() {
      $('certificateRestorePassword').focus();
    },

    /**
     * Clears any uncommitted input, and dismisses the overlay.
     * @private
     */
    dismissOverlay_: function() {
      this.clearInputFields_();
      PageManager.closeOverlay();
    },

    /**
     * Attempt the restore operation.
     * The overlay will be left up with inputs disabled until the backend
     * finishes and dismisses it.
     * @private
     */
    finishRestore_: function() {
      chrome.send('importPersonalCertificatePasswordSelected',
                  [$('certificateRestorePassword').value]);
      $('certificateRestoreCancelButton').disabled = true;
      $('certificateRestoreOkButton').disabled = true;
    },

    /**
     * Cancel the restore operation.
     * @private
     */
    cancelRestore_: function() {
      chrome.send('cancelImportExportCertificate');
      this.dismissOverlay_();
    },

    /**
     * Clears the value of each input field.
     * @private
     */
    clearInputFields_: function() {
      $('certificateRestorePassword').value = '';
      $('certificateRestoreCancelButton').disabled = false;
      $('certificateRestoreOkButton').disabled = false;
    },
  };

  CertificateRestoreOverlay.show = function() {
    CertificateRestoreOverlay.getInstance().clearInputFields_();
    PageManager.showPageByName('certificateRestore');
  };

  CertificateRestoreOverlay.dismiss = function() {
    CertificateRestoreOverlay.getInstance().dismissOverlay_();
  };

  // Export
  return {
    CertificateRestoreOverlay: CertificateRestoreOverlay
  };

});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /** @const */ var Page = cr.ui.pageManager.Page;
  /** @const */ var PageManager = cr.ui.pageManager.PageManager;

  /**
   * CertificateBackupOverlay class
   * Encapsulated handling of the 'enter backup password' overlay page.
   * @class
   */
  function CertificateBackupOverlay() {
    Page.call(this, 'certificateBackupOverlay', '', 'certificateBackupOverlay');
  }

  cr.addSingletonGetter(CertificateBackupOverlay);

  CertificateBackupOverlay.prototype = {
    __proto__: Page.prototype,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      var self = this;
      $('certificateBackupCancelButton').onclick = function(event) {
        self.cancelBackup_();
      };
      $('certificateBackupOkButton').onclick = function(event) {
        self.finishBackup_();
      };
      var onBackupPasswordInput = function(event) {
        self.comparePasswords_();
      };
      $('certificateBackupPassword').oninput = onBackupPasswordInput;
      $('certificateBackupPassword2').oninput = onBackupPasswordInput;

      self.clearInputFields_();
    },

    /**
     * Clears any uncommitted input, and dismisses the overlay.
     * @private
     */
    dismissOverlay_: function() {
      this.clearInputFields_();
      PageManager.closeOverlay();
    },

    /**
     * Attempt the Backup operation.
     * The overlay will be left up with inputs disabled until the backend
     * finishes and dismisses it.
     * @private
     */
    finishBackup_: function() {
      chrome.send('exportPersonalCertificatePasswordSelected',
                  [$('certificateBackupPassword').value]);
      $('certificateBackupCancelButton').disabled = true;
      $('certificateBackupOkButton').disabled = true;
      $('certificateBackupPassword').disabled = true;
      $('certificateBackupPassword2').disabled = true;
    },

    /**
     * Cancel the Backup operation.
     * @private
     */
    cancelBackup_: function() {
      chrome.send('cancelImportExportCertificate');
      this.dismissOverlay_();
    },

    /**
     * Compares the password fields and sets the button state appropriately.
     * @private
     */
    comparePasswords_: function() {
      var password1 = $('certificateBackupPassword').value;
      var password2 = $('certificateBackupPassword2').value;
      $('certificateBackupOkButton').disabled =
          !password1 || password1 != password2;
    },

    /**
     * Clears the value of each input field.
     * @private
     */
    clearInputFields_: function() {
      $('certificateBackupPassword').value = '';
      $('certificateBackupPassword2').value = '';
      $('certificateBackupPassword').disabled = false;
      $('certificateBackupPassword2').disabled = false;
      $('certificateBackupCancelButton').disabled = false;
      $('certificateBackupOkButton').disabled = true;
    },
  };

  CertificateBackupOverlay.show = function() {
    CertificateBackupOverlay.getInstance().clearInputFields_();
    PageManager.showPageByName('certificateBackupOverlay');
  };

  CertificateBackupOverlay.dismiss = function() {
    CertificateBackupOverlay.getInstance().dismissOverlay_();
  };

  // Export
  return {
    CertificateBackupOverlay: CertificateBackupOverlay
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /** @const */ var Page = cr.ui.pageManager.Page;
  /** @const */ var PageManager = cr.ui.pageManager.PageManager;

  /**
   * CertificateEditCaTrustOverlay class
   * Encapsulated handling of the 'edit ca trust' and 'import ca' overlay pages.
   * @class
   */
  function CertificateEditCaTrustOverlay() {
    Page.call(this, 'certificateEditCaTrustOverlay', '',
              'certificateEditCaTrustOverlay');
  }

  cr.addSingletonGetter(CertificateEditCaTrustOverlay);

  CertificateEditCaTrustOverlay.prototype = {
    __proto__: Page.prototype,

    /**
     * Dismisses the overlay.
     * @private
     */
    dismissOverlay_: function() {
      PageManager.closeOverlay();
    },

    /**
     * Enables or disables input fields.
     * @private
     */
    enableInputs_: function(enabled) {
      $('certificateCaTrustSSLCheckbox').disabled =
      $('certificateCaTrustEmailCheckbox').disabled =
      $('certificateCaTrustObjSignCheckbox').disabled =
      $('certificateEditCaTrustCancelButton').disabled =
      $('certificateEditCaTrustOkButton').disabled = !enabled;
    },

    /**
     * Attempt the Edit operation.
     * The overlay will be left up with inputs disabled until the backend
     * finishes and dismisses it.
     * @private
     */
    finishEdit_: function() {
      // TODO(mattm): Send checked values as booleans.  For now send them as
      // strings, since WebUIBindings::send does not support any other types :(
      chrome.send('editCaCertificateTrust',
                  [this.certId,
                   $('certificateCaTrustSSLCheckbox').checked.toString(),
                   $('certificateCaTrustEmailCheckbox').checked.toString(),
                   $('certificateCaTrustObjSignCheckbox').checked.toString()]);
      this.enableInputs_(false);
    },

    /**
     * Cancel the Edit operation.
     * @private
     */
    cancelEdit_: function() {
      this.dismissOverlay_();
    },

    /**
     * Attempt the Import operation.
     * The overlay will be left up with inputs disabled until the backend
     * finishes and dismisses it.
     * @private
     */
    finishImport_: function() {
      // TODO(mattm): Send checked values as booleans.  For now send them as
      // strings, since WebUIBindings::send does not support any other types :(
      chrome.send('importCaCertificateTrustSelected',
                  [$('certificateCaTrustSSLCheckbox').checked.toString(),
                   $('certificateCaTrustEmailCheckbox').checked.toString(),
                   $('certificateCaTrustObjSignCheckbox').checked.toString()]);
      this.enableInputs_(false);
    },

    /**
     * Cancel the Import operation.
     * @private
     */
    cancelImport_: function() {
      chrome.send('cancelImportExportCertificate');
      this.dismissOverlay_();
    },
  };

  /**
   * Callback from CertificateManagerHandler with the trust values.
   * @param {boolean} trustSSL The initial value of SSL trust checkbox.
   * @param {boolean} trustEmail The initial value of Email trust checkbox.
   * @param {boolean} trustObjSign The initial value of Object Signing trust.
   */
  CertificateEditCaTrustOverlay.populateTrust = function(
      trustSSL, trustEmail, trustObjSign) {
    $('certificateCaTrustSSLCheckbox').checked = trustSSL;
    $('certificateCaTrustEmailCheckbox').checked = trustEmail;
    $('certificateCaTrustObjSignCheckbox').checked = trustObjSign;
    CertificateEditCaTrustOverlay.getInstance().enableInputs_(true);
  };

  /**
   * Show the Edit CA Trust overlay.
   * @param {string} certId The id of the certificate to be passed to the
   * certificate manager model.
   * @param {string} certName The display name of the certificate.
   * checkbox.
   */
  CertificateEditCaTrustOverlay.show = function(certId, certName) {
    var self = CertificateEditCaTrustOverlay.getInstance();
    self.certId = certId;
    $('certificateEditCaTrustCancelButton').onclick = function(event) {
      self.cancelEdit_();
    };
    $('certificateEditCaTrustOkButton').onclick = function(event) {
      self.finishEdit_();
    };
    $('certificateEditCaTrustDescription').textContent =
        loadTimeData.getStringF('certificateEditCaTrustDescriptionFormat',
                                certName);
    self.enableInputs_(false);
    PageManager.showPageByName('certificateEditCaTrustOverlay');
    chrome.send('getCaCertificateTrust', [certId]);
  };

  /**
   * Show the Import CA overlay.
   * @param {string} certName The display name of the certificate.
   * checkbox.
   */
  CertificateEditCaTrustOverlay.showImport = function(certName) {
    var self = CertificateEditCaTrustOverlay.getInstance();
    // TODO(mattm): do we want a view certificate button here like firefox has?
    $('certificateEditCaTrustCancelButton').onclick = function(event) {
      self.cancelImport_();
    };
    $('certificateEditCaTrustOkButton').onclick = function(event) {
      self.finishImport_();
    };
    $('certificateEditCaTrustDescription').textContent =
        loadTimeData.getStringF('certificateImportCaDescriptionFormat',
                                certName);
    CertificateEditCaTrustOverlay.populateTrust(false, false, false);
    PageManager.showPageByName('certificateEditCaTrustOverlay');
  };

  CertificateEditCaTrustOverlay.dismiss = function() {
    CertificateEditCaTrustOverlay.getInstance().dismissOverlay_();
  };

  // Export
  return {
    CertificateEditCaTrustOverlay: CertificateEditCaTrustOverlay
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  var Page = cr.ui.pageManager.Page;
  var PageManager = cr.ui.pageManager.PageManager;

  /**
   * CertificateImportErrorOverlay class
   * Displays a list of certificates and errors.
   * @class
   */
  function CertificateImportErrorOverlay() {
    Page.call(this, 'certificateImportErrorOverlay', '',
              'certificateImportErrorOverlay');
  }

  cr.addSingletonGetter(CertificateImportErrorOverlay);

  CertificateImportErrorOverlay.prototype = {
    // Inherit CertificateImportErrorOverlay from Page.
    __proto__: Page.prototype,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      $('certificateImportErrorOverlayOk').onclick = function(event) {
        PageManager.closeOverlay();
      };
    },
  };

  /**
   * Show an alert overlay with the given message, button titles, and
   * callbacks.
   * @param {string} title The alert title to display to the user.
   * @param {string} message The alert message to display to the user.
   * @param {Array} certErrors The list of cert errors.  Each error should have
   *                           a .name and .error attribute.
   */
  CertificateImportErrorOverlay.show = function(title, message, certErrors) {
    $('certificateImportErrorOverlayTitle').textContent = title;
    $('certificateImportErrorOverlayMessage').textContent = message;

    var ul = $('certificateImportErrorOverlayCertErrors');
    ul.innerHTML = '';
    for (var i = 0; i < certErrors.length; ++i) {
      var li = document.createElement('li');
      li.textContent = loadTimeData.getStringF('certificateImportErrorFormat',
                                               certErrors[i].name,
                                               certErrors[i].error);
      ul.appendChild(li);
    }

    PageManager.showPageByName('certificateImportErrorOverlay');
  };

  // Export
  return {
    CertificateImportErrorOverlay: CertificateImportErrorOverlay
  };

});

var CertificateManager = options.CertificateManager;
var CertificateRestoreOverlay = options.CertificateRestoreOverlay;
var CertificateBackupOverlay = options.CertificateBackupOverlay;
var CertificateEditCaTrustOverlay = options.CertificateEditCaTrustOverlay;
var CertificateImportErrorOverlay = options.CertificateImportErrorOverlay;
// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  var Page = cr.ui.pageManager.Page;
  var PageManager = cr.ui.pageManager.PageManager;

  /**
   * AlertOverlay class
   * Encapsulated handling of a generic alert.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function AlertOverlay() {
    Page.call(this, 'alertOverlay', '', 'alertOverlay');
  }

  cr.addSingletonGetter(AlertOverlay);

  AlertOverlay.prototype = {
    // Inherit AlertOverlay from Page.
    __proto__: Page.prototype,

    /**
     * Whether the page can be shown. Used to make sure the page is only
     * shown via AlertOverlay.Show(), and not via the address bar.
     * @private
     */
    canShow_: false,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      // AlertOverlay is special in that it is not tied to one page or overlay.
      this.alwaysOnTop = true;

      var self = this;
      $('alertOverlayOk').onclick = function(event) {
        self.handleOK_();
      };

      $('alertOverlayCancel').onclick = function(event) {
        self.handleCancel_();
      };
    },

    /**
     * Handle the 'ok' button.  Clear the overlay and call the ok callback if
     * available.
     * @private
     */
    handleOK_: function() {
      PageManager.closeOverlay();
      if (this.okCallback != undefined) {
        this.okCallback.call();
      }
    },

    /**
     * Handle the 'cancel' button.  Clear the overlay and call the cancel
     * callback if available.
     * @private
     */
    handleCancel_: function() {
      PageManager.closeOverlay();
      if (this.cancelCallback != undefined) {
        this.cancelCallback.call();
      }
    },

    /**
     * The page is getting hidden. Don't let it be shown again.
     * @override
     */
    willHidePage: function() {
      this.canShow_ = false;
    },

    /** @override */
    canShowPage: function() {
      return this.canShow_;
    },
  };

  /**
   * Show an alert overlay with the given message, button titles, and
   * callbacks.
   * @param {string} title The alert title to display to the user.
   * @param {string} message The alert message to display to the user.
   * @param {string} okTitle The title of the OK button. If undefined or empty,
   *     no button is shown.
   * @param {string} cancelTitle The title of the cancel button. If undefined or
   *     empty, no button is shown.
   * @param {function()} okCallback A function to be called when the user
   *     presses the ok button.  The alert window will be closed automatically.
   *     Can be undefined.
   * @param {function()} cancelCallback A function to be called when the user
   *     presses the cancel button.  The alert window will be closed
   *     automatically.  Can be undefined.
   */
  AlertOverlay.show = function(
      title, message, okTitle, cancelTitle, okCallback, cancelCallback) {
    if (title != undefined) {
      $('alertOverlayTitle').textContent = title;
      $('alertOverlayTitle').style.display = 'block';
    } else {
      $('alertOverlayTitle').style.display = 'none';
    }

    if (message != undefined) {
      $('alertOverlayMessage').textContent = message;
      $('alertOverlayMessage').style.display = 'block';
    } else {
      $('alertOverlayMessage').style.display = 'none';
    }

    if (okTitle != undefined && okTitle != '') {
      $('alertOverlayOk').textContent = okTitle;
      $('alertOverlayOk').style.display = 'block';
    } else {
      $('alertOverlayOk').style.display = 'none';
    }

    if (cancelTitle != undefined && cancelTitle != '') {
      $('alertOverlayCancel').textContent = cancelTitle;
      $('alertOverlayCancel').style.display = 'inline';
    } else {
      $('alertOverlayCancel').style.display = 'none';
    }

    var alertOverlay = AlertOverlay.getInstance();
    alertOverlay.okCallback = okCallback;
    alertOverlay.cancelCallback = cancelCallback;
    alertOverlay.canShow_ = true;

    // Intentionally don't show the URL in the location bar as we don't want
    // people trying to navigate here by hand.
    PageManager.showPageByName('alertOverlay', false);
  };

  // Export
  return {
    AlertOverlay: AlertOverlay
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /** @const */ var Page = cr.ui.pageManager.Page;
  /** @const */ var PageManager = cr.ui.pageManager.PageManager;
  /** @const */ var ArrayDataModel = cr.ui.ArrayDataModel;

  /**
   * AutofillEditAddressOverlay class
   * Encapsulated handling of the 'Add Page' overlay page.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function AutofillEditAddressOverlay() {
    Page.call(this, 'autofillEditAddress',
              loadTimeData.getString('autofillEditAddressTitle'),
              'autofill-edit-address-overlay');
  }

  cr.addSingletonGetter(AutofillEditAddressOverlay);

  AutofillEditAddressOverlay.prototype = {
    __proto__: Page.prototype,

    /**
     * The GUID of the loaded address.
     * @type {string}
     */
    guid_: '',

    /**
     * The BCP 47 language code for the layout of input fields.
     * @type {string}
     */
    languageCode_: '',

    /**
     * The saved field values for the address. For example, if the user changes
     * from United States to Switzerland, then the State field will be hidden
     * and its value will be stored here. If the user changes back to United
     * States, then the State field will be restored to its previous value, as
     * stored in this object.
     * @type {Object}
     */
    savedFieldValues_: {},

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      var self = this;
      $('autofill-edit-address-cancel-button').onclick = function(event) {
        self.dismissOverlay_();
      };

      // TODO(jhawkins): Investigate other possible solutions.
      $('autofill-edit-address-apply-button').onclick = function(event) {
        // Blur active element to ensure that pending changes are committed.
        if (document.activeElement)
          document.activeElement.blur();
        self.saveAddress_();
        self.dismissOverlay_();
      };

      this.guid_ = '';
      this.populateCountryList_();
      this.rebuildInputFields_(/** @type {Array<Array<Object>>} */(
          loadTimeData.getValue('autofillDefaultCountryComponents')));
      this.languageCode_ =
          loadTimeData.getString('autofillDefaultCountryLanguageCode');
      this.connectInputEvents_();
      this.setInputFields_({});
      this.getCountrySwitcher_().onchange = function(event) {
        self.countryChanged_();
      };
    },

    /**
    * Specifically catch the situations in which the overlay is cancelled
    * externally (e.g. by pressing <Esc>), so that the input fields and
    * GUID can be properly cleared.
    * @override
    */
    handleCancel: function() {
      this.dismissOverlay_();
    },

    /**
     * Clears any uncommitted input, resets the stored GUID and dismisses the
     * overlay.
     * @private
     */
    dismissOverlay_: function() {
      this.setInputFields_({});
      this.inputFieldChanged_();
      this.guid_ = '';
      this.languageCode_ = '';
      this.savedInputFields_ = {};
      PageManager.closeOverlay();
    },

    /**
     * @return {Element} The element used to switch countries.
     * @private
     */
    getCountrySwitcher_: function() {
      return this.pageDiv.querySelector('[field=country]');
    },

    /**
     * Returns all text input elements.
     * @return {!NodeList} The text input elements.
     * @private
     */
    getTextFields_: function() {
      return this.pageDiv.querySelectorAll('textarea[field], input[field]');
    },

    /**
     * Creates a map from type => value for all text fields.
     * @return {Object} The mapping from field names to values.
     * @private
     */
    getInputFields_: function() {
      var address = {country: this.getCountrySwitcher_().value};

      var fields = this.getTextFields_();
      for (var i = 0; i < fields.length; i++) {
        address[fields[i].getAttribute('field')] = fields[i].value;
      }

      return address;
    },

    /**
     * Sets the value of each input field according to |address|.
     * @param {Object} address The object with values to use.
     * @private
     */
    setInputFields_: function(address) {
      this.getCountrySwitcher_().value = address.country || '';

      var fields = this.getTextFields_();
      for (var i = 0; i < fields.length; i++) {
        fields[i].value = address[fields[i].getAttribute('field')] || '';
      }
    },

    /**
     * Aggregates the values in the input fields into an array and sends the
     * array to the Autofill handler.
     * @private
     */
    saveAddress_: function() {
      var inputFields = this.getInputFields_();
      var address = [
        this.guid_,
        inputFields['fullName'] || [],
        inputFields['companyName'] || '',
        inputFields['addrLines'] || '',
        inputFields['dependentLocality'] || '',
        inputFields['city'] || '',
        inputFields['state'] || '',
        inputFields['postalCode'] || '',
        inputFields['sortingCode'] || '',
        inputFields['country'] || loadTimeData.getString('defaultCountryCode'),
        inputFields['phone'] || [],
        inputFields['email'] || [],
        this.languageCode_,
      ];
      chrome.send('setAddress', address);

      // If the GUID is empty, this form is being used to add a new address,
      // rather than edit an existing one.
      if (!this.guid_.length) {
        chrome.send('coreOptionsUserMetricsAction',
                    ['Options_AutofillAddressAdded']);
      }
    },

    /**
     * Connects each input field to the inputFieldChanged_() method that enables
     * or disables the 'Ok' button based on whether all the fields are empty or
     * not.
     * @private
     */
    connectInputEvents_: function() {
      var fields = this.getTextFields_();
      for (var i = 0; i < fields.length; i++) {
        fields[i].oninput = this.inputFieldChanged_.bind(this);
      }
    },

    /**
     * Disables the 'Ok' button if all of the fields are empty.
     * @private
     */
    inputFieldChanged_: function() {
      var disabled = !this.getCountrySwitcher_().value;
      if (disabled) {
        var fields = this.getTextFields_();
        for (var i = 0; i < fields.length; i++) {
          if (fields[i].value) {
            disabled = false;
            break;
          }
        }
      }

      $('autofill-edit-address-apply-button').disabled = disabled;
    },

    /**
     * Updates the address fields appropriately for the selected country.
     * @private
     */
    countryChanged_: function() {
      var countryCode = this.getCountrySwitcher_().value;
      if (countryCode)
        chrome.send('loadAddressEditorComponents', [countryCode]);
      else
        this.inputFieldChanged_();
    },

    /**
     * Populates the country <select> list.
     * @private
     */
    populateCountryList_: function() {
      var countryList = loadTimeData.getValue('autofillCountrySelectList');

      // Add the countries to the country <select>.
      var countrySelect = this.getCountrySwitcher_();
      // Add an empty option.
      countrySelect.appendChild(new Option('', ''));
      for (var i = 0; i < countryList.length; i++) {
        var option = new Option(countryList[i].name,
                                countryList[i].value);
        option.disabled = countryList[i].value == 'separator';
        countrySelect.appendChild(option);
      }
    },

    /**
     * Called to prepare the overlay when a new address is being added.
     * @private
     */
    prepForNewAddress_: function() {
      // Focus the first element.
      this.pageDiv.querySelector('input').focus();
    },

    /**
     * Loads the address data from |address|, sets the input fields based on
     * this data, and stores the GUID and language code of the address.
     * @param {!Object} address Lots of info about an address from the browser.
     * @private
     */
    loadAddress_: function(address) {
      this.rebuildInputFields_(address.components);
      this.setInputFields_(address);
      this.inputFieldChanged_();
      this.connectInputEvents_();
      this.guid_ = address.guid;
      this.languageCode_ = address.languageCode;
    },

    /**
     * Takes a snapshot of the input values, clears the input values, loads the
     * address input layout from |input.components|, restores the input values
     * from snapshot, and stores the |input.languageCode| for the address.
     * @param {{languageCode: string, components: Array<Array<Object>>}} input
     *     Info about how to layout inputs fields in this dialog.
     * @private
     */
    loadAddressComponents_: function(input) {
      var inputFields = this.getInputFields_();
      for (var fieldName in inputFields) {
        if (inputFields.hasOwnProperty(fieldName))
          this.savedFieldValues_[fieldName] = inputFields[fieldName];
      }
      this.rebuildInputFields_(input.components);
      this.setInputFields_(this.savedFieldValues_);
      this.inputFieldChanged_();
      this.connectInputEvents_();
      this.languageCode_ = input.languageCode;
    },

    /**
     * Clears address inputs and rebuilds the input fields according to
     * |components|.
     * @param {Array<Array<Object>>} components A list of information about
     *     each input field.
     * @private
     */
    rebuildInputFields_: function(components) {
      var content = $('autofill-edit-address-fields');
      content.innerHTML = '';

      var customInputElements = {addrLines: 'textarea'};

      for (var i in components) {
        var row = document.createElement('div');
        row.classList.add('input-group', 'settings-row');
        content.appendChild(row);

        for (var j in components[i]) {
          if (components[i][j].field == 'country')
            continue;

          var fieldContainer = document.createElement('label');
          row.appendChild(fieldContainer);

          var fieldName = document.createElement('div');
          fieldName.textContent = components[i][j].name;
          fieldContainer.appendChild(fieldName);

          var input = document.createElement(
              customInputElements[components[i][j].field] || 'input');
          input.setAttribute('field', components[i][j].field);
          input.classList.add(components[i][j].length);
          fieldContainer.appendChild(input);
        }
      }
    },
  };

  AutofillEditAddressOverlay.prepForNewAddress = function() {
    AutofillEditAddressOverlay.getInstance().prepForNewAddress_();
  };

  AutofillEditAddressOverlay.loadAddress = function(address) {
    AutofillEditAddressOverlay.getInstance().loadAddress_(address);
  };

  AutofillEditAddressOverlay.loadAddressComponents = function(input) {
    AutofillEditAddressOverlay.getInstance().loadAddressComponents_(input);
  };

  AutofillEditAddressOverlay.setTitle = function(title) {
    $('autofill-address-title').textContent = title;
  };

  // Export
  return {
    AutofillEditAddressOverlay: AutofillEditAddressOverlay
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /** @const */ var Page = cr.ui.pageManager.Page;
  /** @const */ var PageManager = cr.ui.pageManager.PageManager;

  /**
   * AutofillEditCreditCardOverlay class
   * Encapsulated handling of the 'Add Page' overlay page.
   * @class
   */
  function AutofillEditCreditCardOverlay() {
    Page.call(this, 'autofillEditCreditCard',
              loadTimeData.getString('autofillEditCreditCardTitle'),
              'autofill-edit-credit-card-overlay');
  }

  cr.addSingletonGetter(AutofillEditCreditCardOverlay);

  AutofillEditCreditCardOverlay.prototype = {
    __proto__: Page.prototype,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      var self = this;
      $('autofill-edit-credit-card-cancel-button').onclick = function(event) {
        self.dismissOverlay_();
      };
      $('autofill-edit-credit-card-apply-button').onclick = function(event) {
        self.saveCreditCard_();
        self.dismissOverlay_();
      };

      self.guid_ = '';
      self.clearInputFields_();
      self.connectInputEvents_();
      self.setDefaultSelectOptions_();
    },

    /**
    * Specifically catch the situations in which the overlay is cancelled
    * externally (e.g. by pressing <Esc>), so that the input fields and
    * GUID can be properly cleared.
    * @override
    */
    handleCancel: function() {
      this.dismissOverlay_();
    },

    /**
     * Clears any uncommitted input, and dismisses the overlay.
     * @private
     */
    dismissOverlay_: function() {
      this.clearInputFields_();
      this.guid_ = '';
      PageManager.closeOverlay();
    },

    /**
     * Aggregates the values in the input fields into an array and sends the
     * array to the Autofill handler.
     * @private
     */
    saveCreditCard_: function() {
      var creditCard = new Array(5);
      creditCard[0] = this.guid_;
      creditCard[1] = $('name-on-card').value;
      creditCard[2] = $('credit-card-number').value;
      creditCard[3] = $('expiration-month').value;
      creditCard[4] = $('expiration-year').value;
      chrome.send('setCreditCard', creditCard);

      // If the GUID is empty, this form is being used to add a new card,
      // rather than edit an existing one.
      if (!this.guid_.length) {
        chrome.send('coreOptionsUserMetricsAction',
                    ['Options_AutofillCreditCardAdded']);
      }
    },

    /**
     * Connects each input field to the inputFieldChanged_() method that enables
     * or disables the 'Ok' button based on whether all the fields are empty or
     * not.
     * @private
     */
    connectInputEvents_: function() {
      var ccNumber = $('credit-card-number');
      $('name-on-card').oninput = ccNumber.oninput =
          $('expiration-month').onchange = $('expiration-year').onchange =
              this.inputFieldChanged_.bind(this);
    },

    /**
     * Checks the values of each of the input fields and disables the 'Ok'
     * button if all of the fields are empty.
     * @param {Event} opt_event Optional data for the 'input' event.
     * @private
     */
    inputFieldChanged_: function(opt_event) {
      var disabled = !$('name-on-card').value.trim() &&
              !$('credit-card-number').value.trim();
      $('autofill-edit-credit-card-apply-button').disabled = disabled;
    },

    /**
     * Sets the default values of the options in the 'Expiration date' select
     * controls.
     * @private
     */
    setDefaultSelectOptions_: function() {
      // Set the 'Expiration month' default options.
      var expirationMonth = $('expiration-month');
      expirationMonth.options.length = 0;
      for (var i = 1; i <= 12; ++i) {
        var text = (i < 10 ? '0' : '') + i;

        var option = document.createElement('option');
        option.text = option.value = text;
        expirationMonth.add(option, null);
      }

      // Set the 'Expiration year' default options.
      var expirationYear = $('expiration-year');
      expirationYear.options.length = 0;

      var date = new Date();
      var year = parseInt(date.getFullYear(), 10);
      for (var i = 0; i < 10; ++i) {
        var text = year + i;
        var option = document.createElement('option');
        option.text = String(text);
        option.value = text;
        expirationYear.add(option, null);
      }
    },

    /**
     * Clears the value of each input field.
     * @private
     */
    clearInputFields_: function() {
      $('name-on-card').value = '';
      $('credit-card-number').value = '';
      $('expiration-month').selectedIndex = 0;
      $('expiration-year').selectedIndex = 0;

      // Reset the enabled status of the 'Ok' button.
      this.inputFieldChanged_();
    },

    /**
     * Sets the value of each input field according to |creditCard|
     * @param {CreditCardData} creditCard
     * @private
     */
    setInputFields_: function(creditCard) {
      $('name-on-card').value = creditCard.nameOnCard;
      $('credit-card-number').value = creditCard.creditCardNumber;

      // The options for the year select control may be out-dated at this point,
      // e.g. the user opened the options page before midnight on New Year's Eve
      // and then loaded a credit card profile to edit in the new year, so
      // reload the select options just to be safe.
      this.setDefaultSelectOptions_();

      var idx = parseInt(creditCard.expirationMonth, 10);
      $('expiration-month').selectedIndex = idx - 1;

      var expYear = creditCard.expirationYear;
      var date = new Date();
      var year = parseInt(date.getFullYear(), 10);
      for (var i = 0; i < 10; ++i) {
        var text = year + i;
        if (expYear == String(text))
          $('expiration-year').selectedIndex = i;
      }
    },

    /**
     * Called to prepare the overlay when a new card is being added.
     * @private
     */
    prepForNewCard_: function() {
      // Focus the first element.
      this.pageDiv.querySelector('input').focus();
    },

    /**
     * Loads the credit card data from |creditCard|, sets the input fields based
     * on this data and stores the GUID of the credit card.
     * @param {CreditCardData} creditCard
     * @private
     */
    loadCreditCard_: function(creditCard) {
      this.setInputFields_(creditCard);
      this.inputFieldChanged_();
      this.guid_ = creditCard.guid;
    },
  };

  AutofillEditCreditCardOverlay.prepForNewCard = function() {
    AutofillEditCreditCardOverlay.getInstance().prepForNewCard_();
  };

  AutofillEditCreditCardOverlay.loadCreditCard = function(creditCard) {
    AutofillEditCreditCardOverlay.getInstance().loadCreditCard_(creditCard);
  };

  AutofillEditCreditCardOverlay.setTitle = function(title) {
    $('autofill-credit-card-title').textContent = title;
  };

  // Export
  return {
    AutofillEditCreditCardOverlay: AutofillEditCreditCardOverlay
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @typedef {{
 *   creditCardNumber: string,
 *   expirationMonth: string,
 *   expirationYear: string,
 *   guid: string,
 *   nameOnCard: string
 * }}
 * @see chrome/browser/ui/webui/options/autofill_options_handler.cc
 */
var CreditCardData;

cr.define('options', function() {
  var Page = cr.ui.pageManager.Page;
  var PageManager = cr.ui.pageManager.PageManager;
  var ArrayDataModel = cr.ui.ArrayDataModel;

  /////////////////////////////////////////////////////////////////////////////
  // AutofillOptions class:

  /**
   * Encapsulated handling of Autofill options page.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function AutofillOptions() {
    Page.call(this, 'autofill',
              loadTimeData.getString('autofillOptionsPageTabTitle'),
              'autofill-options');
  }

  cr.addSingletonGetter(AutofillOptions);

  AutofillOptions.prototype = {
    __proto__: Page.prototype,

    /**
     * The address list.
     * @type {options.DeletableItemList}
     * @private
     */
    addressList_: null,

    /**
     * The credit card list.
     * @type {options.DeletableItemList}
     * @private
     */
    creditCardList_: null,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      this.createAddressList_();
      this.createCreditCardList_();

      var self = this;
      $('autofill-add-address').onclick = function(event) {
        self.showAddAddressOverlay_();
      };
      $('autofill-add-creditcard').onclick = function(event) {
        self.showAddCreditCardOverlay_();
      };
      $('autofill-options-confirm').onclick = function(event) {
        PageManager.closeOverlay();
      };

      $('autofill-help').onclick = function(event) {
        chrome.send('coreOptionsUserMetricsAction',
                    ['Options_AutofillShowAbout']);
        return true;  // Always follow the href
      };

      // TODO(jhawkins): What happens when Autofill is disabled whilst on the
      // Autofill options page?
    },

    /**
     * Creates, decorates and initializes the address list.
     * @private
     */
    createAddressList_: function() {
      var addressList = $('address-list');
      options.autofillOptions.AutofillAddressList.decorate(addressList);
      this.addressList_ = assertInstanceof(addressList,
                                           options.DeletableItemList);
      this.addressList_.autoExpands = true;
    },

    /**
     * Creates, decorates and initializes the credit card list.
     * @private
     */
    createCreditCardList_: function() {
      var creditCardList = $('creditcard-list');
      options.autofillOptions.AutofillCreditCardList.decorate(creditCardList);
      this.creditCardList_ = assertInstanceof(creditCardList,
                                              options.DeletableItemList);
      this.creditCardList_.autoExpands = true;
    },

    /**
     * Shows the 'Add address' overlay, specifically by loading the
     * 'Edit address' overlay and modifying the overlay title.
     * @private
     */
    showAddAddressOverlay_: function() {
      var title = loadTimeData.getString('addAddressTitle');
      AutofillEditAddressOverlay.setTitle(title);
      PageManager.showPageByName('autofillEditAddress');
      AutofillEditAddressOverlay.prepForNewAddress();
    },

    /**
     * Shows the 'Add credit card' overlay, specifically by loading the
     * 'Edit credit card' overlay and modifying the overlay title.
     * @private
     */
    showAddCreditCardOverlay_: function() {
      var title = loadTimeData.getString('addCreditCardTitle');
      AutofillEditCreditCardOverlay.setTitle(title);
      PageManager.showPageByName('autofillEditCreditCard');
      AutofillEditCreditCardOverlay.prepForNewCard();
    },

    /**
     * Updates the data model for the address list with the values from
     * |entries|.
     * @param {!Array} entries The list of addresses.
     */
    setAddressList_: function(entries) {
      this.addressList_.dataModel = new ArrayDataModel(entries);
    },

    /**
     * Updates the data model for the credit card list with the values from
     * |entries|.
     * @param {!Array} entries The list of credit cards.
     */
    setCreditCardList_: function(entries) {
      this.creditCardList_.dataModel = new ArrayDataModel(entries);
    },

    /**
     * Removes the Autofill address or credit card represented by |guid|.
     * @param {string} guid The GUID of the address to remove.
     * @param {string=} metricsAction The name of the action to log for metrics.
     * @private
     */
    removeData_: function(guid, metricsAction) {
      chrome.send('removeData', [guid]);
      if (metricsAction)
        chrome.send('coreOptionsUserMetricsAction', [metricsAction]);
    },

    /**
     * Shows the 'Edit address' overlay, using the data in |address| to fill the
     * input fields. |address| is a list with one item, an associative array
     * that contains the address data.
     * @private
     */
    showEditAddressOverlay_: function(address) {
      var title = loadTimeData.getString('editAddressTitle');
      AutofillEditAddressOverlay.setTitle(title);
      AutofillEditAddressOverlay.loadAddress(address);
      PageManager.showPageByName('autofillEditAddress');
    },

    /**
     * Shows the 'Edit credit card' overlay, using the data in |credit_card| to
     * fill the input fields. |creditCard| is a list with one item, an
     * associative array that contains the credit card data.
     * @param {CreditCardData} creditCard
     * @private
     */
    showEditCreditCardOverlay_: function(creditCard) {
      var title = loadTimeData.getString('editCreditCardTitle');
      AutofillEditCreditCardOverlay.setTitle(title);
      AutofillEditCreditCardOverlay.loadCreditCard(creditCard);
      PageManager.showPageByName('autofillEditCreditCard');
    },
  };

  AutofillOptions.setAddressList = function(entries) {
    AutofillOptions.getInstance().setAddressList_(entries);
  };

  AutofillOptions.setCreditCardList = function(entries) {
    AutofillOptions.getInstance().setCreditCardList_(entries);
  };

  AutofillOptions.removeData = function(guid, metricsAction) {
    AutofillOptions.getInstance().removeData_(guid, metricsAction);
  };

  AutofillOptions.editAddress = function(address) {
    AutofillOptions.getInstance().showEditAddressOverlay_(address);
  };

  /**
   * @param {CreditCardData} creditCard
   */
  AutofillOptions.editCreditCard = function(creditCard) {
    AutofillOptions.getInstance().showEditCreditCardOverlay_(creditCard);
  };

  // Export
  return {
    AutofillOptions: AutofillOptions
  };

});


// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @typedef {{
 *   guid: string,
 *   label: string,
 *   sublabel: string,
 *   isLocal: boolean,
 *   isCached: boolean
 * }}
 * @see chrome/browser/ui/webui/options/autofill_options_handler.cc
 */
var AutofillEntityMetadata;

cr.define('options.autofillOptions', function() {
  /** @const */ var DeletableItem = options.DeletableItem;
  /** @const */ var DeletableItemList = options.DeletableItemList;
  /** @const */ var InlineEditableItem = options.InlineEditableItem;
  /** @const */ var InlineEditableItemList = options.InlineEditableItemList;

  /**
   * @return {!HTMLButtonElement}
   */
  function AutofillEditProfileButton(edit) {
    var editButtonEl = /** @type {HTMLButtonElement} */(
        document.createElement('button'));
    editButtonEl.className =
        'list-inline-button hide-until-hover custom-appearance';
    editButtonEl.textContent =
        loadTimeData.getString('autofillEditProfileButton');
    editButtonEl.onclick = edit;

    editButtonEl.onmousedown = function(e) {
      // Don't select the row when clicking the button.
      e.stopPropagation();
      // Don't focus on the button when clicking it.
      e.preventDefault();
    };

    return editButtonEl;
  }

  /** @return {!Element} */
  function CreateGoogleAccountLabel() {
    var label = document.createElement('div');
    label.className = 'deemphasized hides-on-hover';
    label.textContent = loadTimeData.getString('autofillFromGoogleAccount');
    return label;
  }

  /**
   * Creates a new address list item.
   * @constructor
   * @param {AutofillEntityMetadata} metadata Details about an address profile.
   * @extends {options.DeletableItem}
   * @see chrome/browser/ui/webui/options/autofill_options_handler.cc
   */
  function AddressListItem(metadata) {
    var el = cr.doc.createElement('div');
    el.__proto__ = AddressListItem.prototype;
    /** @private */
    el.metadata_ = metadata;
    el.decorate();

    return el;
  }

  AddressListItem.prototype = {
    __proto__: DeletableItem.prototype,

    /** @override */
    decorate: function() {
      DeletableItem.prototype.decorate.call(this);

      var label = this.ownerDocument.createElement('div');
      label.className = 'autofill-list-item';
      label.textContent = this.metadata_.label;
      this.contentElement.appendChild(label);

      var sublabel = this.ownerDocument.createElement('div');
      sublabel.className = 'deemphasized';
      sublabel.textContent = this.metadata_.sublabel;
      this.contentElement.appendChild(sublabel);

      if (!this.metadata_.isLocal) {
        this.deletable = false;
        this.contentElement.appendChild(CreateGoogleAccountLabel());
      }

      // The 'Edit' button.
      var metadata = this.metadata_;
      var editButtonEl = AutofillEditProfileButton(
          AddressListItem.prototype.loadAddressEditor.bind(this));
      this.contentElement.appendChild(editButtonEl);
    },

    /**
     * For local Autofill data, this function causes the AutofillOptionsHandler
     * to call showEditAddressOverlay(). For Wallet data, the user is
     * redirected to the Wallet web interface.
     */
    loadAddressEditor: function() {
      if (this.metadata_.isLocal)
        chrome.send('loadAddressEditor', [this.metadata_.guid]);
      else
        window.open(loadTimeData.getString('manageWalletAddressesUrl'));
    },
  };

  /**
   * Creates a new credit card list item.
   * @param {AutofillEntityMetadata} metadata Details about a credit card.
   * @constructor
   * @extends {options.DeletableItem}
   */
  function CreditCardListItem(metadata) {
    var el = cr.doc.createElement('div');
    el.__proto__ = CreditCardListItem.prototype;
    /** @private */
    el.metadata_ = metadata;
    el.decorate();

    return el;
  }

  CreditCardListItem.prototype = {
    __proto__: DeletableItem.prototype,

    /** @override */
    decorate: function() {
      DeletableItem.prototype.decorate.call(this);

      var label = this.ownerDocument.createElement('div');
      label.className = 'autofill-list-item';
      label.textContent = this.metadata_.label;
      this.contentElement.appendChild(label);

      var sublabel = this.ownerDocument.createElement('div');
      sublabel.className = 'deemphasized';
      sublabel.textContent = this.metadata_.sublabel;
      this.contentElement.appendChild(sublabel);

      if (!this.metadata_.isLocal) {
        this.deletable = false;
        this.contentElement.appendChild(CreateGoogleAccountLabel());
      }

      var guid = this.metadata_.guid;
      if (this.metadata_.isCached) {
        var localCopyText = this.ownerDocument.createElement('span');
        localCopyText.className = 'hide-until-hover deemphasized';
        localCopyText.textContent =
            loadTimeData.getString('autofillDescribeLocalCopy');
        this.contentElement.appendChild(localCopyText);

        var clearLocalCopyButton = AutofillEditProfileButton(
            function() { chrome.send('clearLocalCardCopy', [guid]); });
        clearLocalCopyButton.textContent =
            loadTimeData.getString('autofillClearLocalCopyButton');
        this.contentElement.appendChild(clearLocalCopyButton);
      }

      // The 'Edit' button.
      var metadata = this.metadata_;
      var editButtonEl = AutofillEditProfileButton(
          CreditCardListItem.prototype.loadCreditCardEditor.bind(this));
      this.contentElement.appendChild(editButtonEl);
    },

    /**
     * For local Autofill data, this function causes the AutofillOptionsHandler
     * to call showEditCreditCardOverlay(). For Wallet data, the user is
     * redirected to the Wallet web interface.
     */
    loadCreditCardEditor: function() {
      if (this.metadata_.isLocal)
        chrome.send('loadCreditCardEditor', [this.metadata_.guid]);
      else
        window.open(loadTimeData.getString('manageWalletPaymentMethodsUrl'));
    },
  };

  /**
   * Base class for shared implementation between address and credit card lists.
   * @constructor
   * @extends {options.DeletableItemList}
   */
  var AutofillProfileList = cr.ui.define('list');

  AutofillProfileList.prototype = {
    __proto__: DeletableItemList.prototype,

    decorate: function() {
      DeletableItemList.prototype.decorate.call(this);

      this.addEventListener('blur', this.onBlur_);
    },

    /**
     * When the list loses focus, unselect all items in the list.
     * @private
     */
    onBlur_: function() {
      this.selectionModel.unselectAll();
    },
  };

  /**
   * Create a new address list.
   * @constructor
   * @extends {options.autofillOptions.AutofillProfileList}
   */
  var AutofillAddressList = cr.ui.define('list');

  AutofillAddressList.prototype = {
    __proto__: AutofillProfileList.prototype,

    decorate: function() {
      AutofillProfileList.prototype.decorate.call(this);
    },

    /** @override */
    activateItemAtIndex: function(index) {
      this.getListItemByIndex(index).loadAddressEditor();
    },

    /**
     * @override
     * @param {AutofillEntityMetadata} metadata
     */
    createItem: function(metadata) {
      return new AddressListItem(metadata);
    },

    /** @override */
    deleteItemAtIndex: function(index) {
      AutofillOptions.removeData(this.dataModel.item(index).guid,
                                 'Options_AutofillAddressDeleted');
    },
  };

  /**
   * Create a new credit card list.
   * @constructor
   * @extends {options.DeletableItemList}
   */
  var AutofillCreditCardList = cr.ui.define('list');

  AutofillCreditCardList.prototype = {
    __proto__: AutofillProfileList.prototype,

    decorate: function() {
      AutofillProfileList.prototype.decorate.call(this);
    },

    /** @override */
    activateItemAtIndex: function(index) {
      this.getListItemByIndex(index).loadCreditCardEditor();
    },

    /**
     * @override
     * @param {AutofillEntityMetadata} metadata
     */
    createItem: function(metadata) {
      return new CreditCardListItem(metadata);
    },

    /** @override */
    deleteItemAtIndex: function(index) {
      AutofillOptions.removeData(this.dataModel.item(index).guid,
                                 'Options_AutofillCreditCardDeleted');
    },
  };

  return {
    AutofillProfileList: AutofillProfileList,
    AddressListItem: AddressListItem,
    CreditCardListItem: CreditCardListItem,
    AutofillAddressList: AutofillAddressList,
    AutofillCreditCardList: AutofillCreditCardList,
  };
});

// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Note: the native-side handler for this is AutomaticSettingsResetHandler.

cr.define('options', function() {
  /** @const */ var PageManager = cr.ui.pageManager.PageManager;

  /**
   * AutomaticSettingsResetBanner class
   * Provides encapsulated handling of the Reset Profile Settings banner.
   * @constructor
   */
  function AutomaticSettingsResetBanner() {}

  cr.addSingletonGetter(AutomaticSettingsResetBanner);

  AutomaticSettingsResetBanner.prototype = {
    /**
     * Whether or not the banner has already been dismissed.
     *
     * This is needed because of the surprising ordering of asynchronous
     * JS<->native calls when the settings page is opened with specifying a
     * given sub-page, e.g. http://chromesettings.github.io/settings/AutomaticSettingsReset.
     *
     * In such a case, AutomaticSettingsResetOverlay's didShowPage(), which
     * calls our dismiss() method, would be called before the native Handlers'
     * InitalizePage() methods have an effect in the JS, which includes calling
     * our show() method. This would mean that the banner would be first
     * dismissed, then shown. We want to prevent this.
     *
     * @private {boolean}
     */
    wasDismissed_: false,

    /**
     * Metric name to send when a show event occurs.
     * @private {string}
     */
    showMetricName_: '',

    /**
     * Name of the native callback invoked when the banner is dismised.
     */
    dismissNativeCallbackName_: '',

    /**
     * DOM element whose visibility is set when setVisibility_ is called.
     * @private {?HTMLElement}
     */
    visibleElement_: null,

    /**
     * Initializes the banner's event handlers.
     * @suppress {checkTypes}
     * TODO(vitalyp): remove the suppression. Suppression is needed because
     * method dismiss() is attached to AutomaticSettingsResetBanner at run-time
     * via "Forward public APIs to protected implementations" pattern (see
     * below). Currently the compiler pass and cr.js handles only forwarding to
     * private implementations using cr.makePublic().
     */
    initialize: function() {
      this.showMetricName_ = 'AutomaticSettingsReset_WebUIBanner_BannerShown';

      this.dismissNativeCallbackName_ =
          'onDismissedAutomaticSettingsResetBanner';

      this.visibleElement_ = getRequiredElement(
          'automatic-settings-reset-banner');

      $('automatic-settings-reset-banner-close').onclick = function(event) {
        chrome.send('metricsHandler:recordAction',
            ['AutomaticSettingsReset_WebUIBanner_ManuallyClosed']);
        AutomaticSettingsResetBanner.dismiss();
      };
      $('automatic-settings-reset-learn-more').onclick = function(event) {
        chrome.send('metricsHandler:recordAction',
            ['AutomaticSettingsReset_WebUIBanner_LearnMoreClicked']);
      };
      $('automatic-settings-reset-banner-activate-reset').onclick =
          function(event) {
        chrome.send('metricsHandler:recordAction',
            ['AutomaticSettingsReset_WebUIBanner_ResetClicked']);
        PageManager.showPageByName('resetProfileSettings');
      };
    },

    /**
     * Sets whether or not the reset profile settings banner shall be visible.
     * @param {boolean} show Whether or not to show the banner.
     * @protected
     */
    setVisibility: function(show) {
      this.visibleElement_.hidden = !show;
    },

    /**
     * Called by the native code to show the banner if needed.
     * @private
     */
    show_: function() {
      if (!this.wasDismissed_) {
        chrome.send('metricsHandler:recordAction', [this.showMetricName_]);
        this.setVisibility(true);
      }
    },

    /**
     * Called when the banner should be closed as a result of something taking
     * place on the WebUI page, i.e. when its close button is pressed, or when
     * the confirmation dialog for the profile settings reset feature is opened.
     * @private
     */
    dismiss_: function() {
      chrome.send(assert(this.dismissNativeCallbackName_));
      this.wasDismissed_ = true;
      this.setVisibility(false);
    },
  };

  // Forward public APIs to private implementations.
  cr.makePublic(AutomaticSettingsResetBanner, [
    'show',
    'dismiss',
  ]);

  // Export
  return {
    AutomaticSettingsResetBanner: AutomaticSettingsResetBanner
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.exportPath('options');

/**
 * @typedef {{actionLinkText: (string|undefined),
 *            childUser: (boolean|undefined),
 *            hasError: (boolean|undefined),
 *            hasUnrecoverableError: (boolean|undefined),
 *            managed: (boolean|undefined),
 *            setupCompleted: (boolean|undefined),
 *            setupInProgress: (boolean|undefined),
 *            signedIn: (boolean|undefined),
 *            signinAllowed: (boolean|undefined),
 *            signoutAllowed: (boolean|undefined),
 *            statusText: (string|undefined),
 *            supervisedUser: (boolean|undefined),
 *            syncSystemEnabled: (boolean|undefined)}}
 * @see chrome/browser/ui/webui/options/browser_options_handler.cc
 */
options.SyncStatus;

/**
 * @typedef {{id: string, name: string}}
 */
options.ExtensionData;

/**
 * @typedef {{name: string,
 *            filePath: string,
 *            isCurrentProfile: boolean,
 *            isSupervised: boolean,
 *            isChild: boolean,
 *            iconUrl: string}}
 * @see chrome/browser/ui/webui/options/browser_options_handler.cc
 */
options.Profile;

cr.define('options', function() {
  var OptionsPage = options.OptionsPage;
  var Page = cr.ui.pageManager.Page;
  var PageManager = cr.ui.pageManager.PageManager;
  var ArrayDataModel = cr.ui.ArrayDataModel;
  var RepeatingButton = cr.ui.RepeatingButton;
  var HotwordSearchSettingIndicator = options.HotwordSearchSettingIndicator;
  var NetworkPredictionOptions = {
    ALWAYS: 0,
    WIFI_ONLY: 1,
    NEVER: 2,
    DEFAULT: 1
  };

  /**
   * Encapsulated handling of browser options page.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function BrowserOptions() {
    Page.call(this, 'settings', loadTimeData.getString('settingsTitle'),
              'settings');
  }

  cr.addSingletonGetter(BrowserOptions);

  /**
   * @param {HTMLElement} section The section to show or hide.
   * @return {boolean} Whether the section should be shown.
   * @private
   */
  BrowserOptions.shouldShowSection_ = function(section) {
    // If the section is hidden or hiding, it should be shown.
    return section.style.height == '' || section.style.height == '0px';
  };

  BrowserOptions.prototype = {
    __proto__: Page.prototype,

    /**
     * Keeps track of whether the user is signed in or not.
     * @private {boolean}
     */
    signedIn_: false,

    /**
     * Indicates whether signing out is allowed or whether a complete profile
     * wipe is required to remove the current enterprise account.
     * @private {boolean}
     */
    signoutAllowed_: true,

    /**
     * Keeps track of whether |onShowHomeButtonChanged_| has been called. See
     * |onShowHomeButtonChanged_|.
     * @private {boolean}
     */
    onShowHomeButtonChangedCalled_: false,

    /**
     * Track if page initialization is complete.  All C++ UI handlers have the
     * chance to manipulate page content within their InitializePage methods.
     * This flag is set to true after all initializers have been called.
     * @private {boolean}
     */
    initializationComplete_: false,

    /**
     * Current status of "Resolve Timezone by Geolocation" checkbox.
     * @private {boolean}
     */
    resolveTimezoneByGeolocation_: false,

    /**
     * True if system timezone is managed by policy.
     * @private {boolean}
     */
    systemTimezoneIsManaged_: false,

    /**
     * Cached bluetooth adapter state.
     * @private {?chrome.bluetooth.AdapterState}
     */
    bluetoothAdapterState_: null,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);
      var self = this;

      if (window.top != window) {
        // The options page is not in its own window.
        document.body.classList.add('uber-frame');
        PageManager.horizontalOffset = 155;
      }

      // Ensure that navigation events are unblocked on uber page. A reload of
      // the settings page while an overlay is open would otherwise leave uber
      // page in a blocked state, where tab switching is not possible.
      uber.invokeMethodOnParent('stopInterceptingEvents');

      window.addEventListener('message', this.handleWindowMessage_.bind(this));

      if (loadTimeData.getBoolean('allowAdvancedSettings')) {
        $('advanced-settings-expander').onclick = function(e) {
          var showAdvanced =
              BrowserOptions.shouldShowSection_($('advanced-settings'));
          if (showAdvanced) {
            chrome.send('coreOptionsUserMetricsAction',
                        ['Options_ShowAdvancedSettings']);
          }
          self.toggleSectionWithAnimation_(
              $('advanced-settings'),
              $('advanced-settings-container'));

          // If the click was triggered using the keyboard and it showed the
          // section (rather than hiding it), focus the first element in the
          // container.
          if (e.detail == 0 && showAdvanced) {
            var focusElement = $('advanced-settings-container').querySelector(
                'button, input, list, select, a[href]');
            if (focusElement)
              focusElement.focus();
          }
        };
      } else {
        $('advanced-settings-footer').hidden = true;
        $('advanced-settings').hidden = true;
      }

      $('advanced-settings').addEventListener('webkitTransitionEnd',
          this.updateAdvancedSettingsExpander_.bind(this));

      if (loadTimeData.getBoolean('showAbout')) {
        $('about-button').hidden = false;
        $('about-button').addEventListener('click', function() {
          PageManager.showPageByName('help');
          chrome.send('coreOptionsUserMetricsAction',
                      ['Options_About']);
        });
      }

      if (cr.isChromeOS) {
        UIAccountTweaks.applyGuestSessionVisibility(document);
        UIAccountTweaks.applyPublicSessionVisibility(document);
        if (loadTimeData.getBoolean('secondaryUser'))
          $('secondary-user-banner').hidden = false;
      }

      // Sync (Sign in) section.
      this.updateSyncState_(/** @type {options.SyncStatus} */(
          loadTimeData.getValue('syncData')));

      $('start-stop-sync').onclick = function(event) {
        if (self.signedIn_) {
          if (self.signoutAllowed_)
            SyncSetupOverlay.showStopSyncingUI();
          else
            chrome.send('showDisconnectManagedProfileDialog');
        } else if (cr.isChromeOS) {
          SyncSetupOverlay.showSetupUI();
        } else {
          SyncSetupOverlay.startSignIn('access-point-settings');
        }
      };
      $('customize-sync').onclick = function(event) {
        SyncSetupOverlay.showSetupUI();
      };

      // Internet connection section (ChromeOS only).
      if (cr.isChromeOS) {
        options.network.NetworkList.decorate($('network-list'));
        // Show that the network settings are shared if this is a secondary user
        // in a multi-profile session.
        if (loadTimeData.getBoolean('secondaryUser')) {
          var networkIndicator = document.querySelector(
              '#network-section-header > .controlled-setting-indicator');
          networkIndicator.setAttribute('controlled-by', 'shared');
          networkIndicator.location = cr.ui.ArrowLocation.TOP_START;
        }
      }

      // On Startup section.
      Preferences.getInstance().addEventListener('session.restore_on_startup',
          this.onRestoreOnStartupChanged_.bind(this));
      Preferences.getInstance().addEventListener(
          'session.startup_urls',
          function(event) {
            $('startup-set-pages').disabled = event.value.disabled;
          });

      $('startup-set-pages').onclick = function() {
        PageManager.showPageByName('startup');
      };

      // Appearance section.
      Preferences.getInstance().addEventListener('browser.show_home_button',
          this.onShowHomeButtonChanged_.bind(this));

      Preferences.getInstance().addEventListener('homepage',
          this.onHomePageChanged_.bind(this));
      Preferences.getInstance().addEventListener('homepage_is_newtabpage',
          this.onHomePageIsNtpChanged_.bind(this));

      $('change-home-page').onclick = function(event) {
        PageManager.showPageByName('homePageOverlay');
        chrome.send('coreOptionsUserMetricsAction',
                    ['Options_Homepage_ShowSettings']);
      };

      HotwordSearchSettingIndicator.decorate(
          $('hotword-search-setting-indicator'));
      HotwordSearchSettingIndicator.decorate(
          $('hotword-no-dsp-search-setting-indicator'));
      var hotwordIndicator = $('hotword-always-on-search-setting-indicator');
      HotwordSearchSettingIndicator.decorate(hotwordIndicator);
      hotwordIndicator.disabledOnErrorSection =
          $('hotword-always-on-search-checkbox');
      chrome.send('requestHotwordAvailable');

      chrome.send('requestGoogleNowAvailable');

      if ($('set-wallpaper')) {
        $('set-wallpaper').onclick = function(event) {
          chrome.send('openWallpaperManager');
          chrome.send('coreOptionsUserMetricsAction',
                      ['Options_OpenWallpaperManager']);
        };
      }

      // Control the hotword-always-on pref with the Hotword Audio
      // Verification app.
      $('hotword-always-on-search-checkbox').customChangeHandler =
          function(event) {
        if (!$('hotword-always-on-search-checkbox').checked)
          return false;

        $('hotword-always-on-search-checkbox').checked = false;
        chrome.send('launchHotwordAudioVerificationApp', [false]);
        return true;
      };

      // Open the Hotword Audio Verification app to retrain a voice model.
      $('hotword-retrain-link').onclick = function(event) {
        chrome.send('launchHotwordAudioVerificationApp', [true]);
      };
      Preferences.getInstance().addEventListener(
          'hotword.always_on_search_enabled',
          this.onHotwordAlwaysOnChanged_.bind(this));

      $('themes-gallery').onclick = function(event) {
        window.open(loadTimeData.getString('themesGalleryURL'));
        chrome.send('coreOptionsUserMetricsAction',
                    ['Options_ThemesGallery']);
      };
      $('themes-reset').onclick = function(event) {
        chrome.send('themesReset');
      };

      if (loadTimeData.getBoolean('profileIsSupervised')) {
        if ($('themes-native-button')) {
          $('themes-native-button').disabled = true;
          $('themes-native-button').hidden = true;
        }
        // Supervised users have just one default theme, even on Linux. So use
        // the same button for Linux as for the other platforms.
        $('themes-reset').textContent = loadTimeData.getString('themesReset');
      }

      // Device section (ChromeOS only).
      if (cr.isChromeOS) {
        if (loadTimeData.getBoolean('showPowerStatus')) {
          $('power-settings-link').onclick = function(evt) {
            PageManager.showPageByName('power-overlay');
            chrome.send('coreOptionsUserMetricsAction',
                        ['Options_ShowPowerSettings']);
          };
          $('power-row').hidden = false;
        }
        $('keyboard-settings-button').onclick = function(evt) {
          PageManager.showPageByName('keyboard-overlay');
          chrome.send('coreOptionsUserMetricsAction',
                      ['Options_ShowKeyboardSettings']);
        };
        $('pointer-settings-button').onclick = function(evt) {
          PageManager.showPageByName('pointer-overlay');
          chrome.send('coreOptionsUserMetricsAction',
                      ['Options_ShowTouchpadSettings']);
        };
      }

      // Search section.
      $('manage-default-search-engines').onclick = function(event) {
        PageManager.showPageByName('searchEngines');
        chrome.send('coreOptionsUserMetricsAction',
                    ['Options_ManageSearchEngines']);
      };
      $('default-search-engine').addEventListener('change',
          this.setDefaultSearchEngine_);

      // Users section.
      if (loadTimeData.valueExists('profilesInfo')) {
        $('profiles-section').hidden = false;
        this.maybeShowUserSection_();

        var profilesList = $('profiles-list');
        options.browser_options.ProfileList.decorate(profilesList);
        profilesList.autoExpands = true;

        // The profiles info data in |loadTimeData| might be stale.
        this.setProfilesInfo_(/** @type {!Array<!options.Profile>} */(
            loadTimeData.getValue('profilesInfo')));
        chrome.send('requestProfilesInfo');

        profilesList.addEventListener('change',
            this.setProfileViewButtonsStatus_);
        $('profiles-create').onclick = function(event) {
          chrome.send('metricsHandler:recordAction',
                      ['Options_ShowCreateProfileDlg']);
          ManageProfileOverlay.showCreateDialog();
        };
        if (OptionsPage.isSettingsApp()) {
          $('profiles-app-list-switch').onclick = function(event) {
            var selectedProfile = self.getSelectedProfileItem_();
            chrome.send('switchAppListProfile', [selectedProfile.filePath]);
          };
        }
        $('profiles-manage').onclick = function(event) {
          chrome.send('metricsHandler:recordAction',
                      ['Options_ShowEditProfileDlg']);
          ManageProfileOverlay.showManageDialog();
        };
        $('profiles-delete').onclick = function(event) {
          var selectedProfile = self.getSelectedProfileItem_();
          if (selectedProfile) {
            chrome.send('metricsHandler:recordAction',
                        ['Options_ShowDeleteProfileDlg']);
            ManageProfileOverlay.showDeleteDialog(selectedProfile);
          }
        };
        if (loadTimeData.getBoolean('profileIsSupervised')) {
          $('profiles-create').disabled = true;
        }
        if (!loadTimeData.getBoolean('allowProfileDeletion')) {
          $('profiles-delete').disabled = true;
          $('profiles-list').canDeleteItems = false;
        }
      }

      if (cr.isChromeOS) {
        // Username (canonical email) of the currently logged in user or
        // |kGuestUser| if a guest session is active.
        this.username_ = loadTimeData.getString('username');

        this.updateAccountPicture_();

        $('account-picture').onclick = this.showImagerPickerOverlay_;
        $('change-picture-caption').onclick = this.showImagerPickerOverlay_;

        $('manage-accounts-button').onclick = function(event) {
          PageManager.showPageByName('accounts');
          chrome.send('coreOptionsUserMetricsAction',
              ['Options_ManageAccounts']);
        };
      } else {
        $('import-data').onclick = function(event) {
          ImportDataOverlay.show();
          chrome.send('coreOptionsUserMetricsAction', ['Import_ShowDlg']);
        };

        if ($('themes-native-button')) {
          $('themes-native-button').onclick = function(event) {
            chrome.send('themesSetNative');
          };
        }
      }

      // Date and time section (CrOS only).
      if (cr.isChromeOS) {
        if ($('set-time-button'))
          $('set-time-button').onclick = this.handleSetTime_.bind(this);

        // Timezone
        if (loadTimeData.getBoolean('enableTimeZoneTrackingOption')) {
          $('resolve-timezone-by-geolocation-selection').hidden = false;
          this.resolveTimezoneByGeolocation_ = loadTimeData.getBoolean(
              'resolveTimezoneByGeolocationInitialValue');
          this.updateTimezoneSectionState_();
          Preferences.getInstance().addEventListener(
              'settings.resolve_timezone_by_geolocation',
              this.onResolveTimezoneByGeolocationChanged_.bind(this));
        }
      }

      // Default browser section.
      if (!cr.isChromeOS) {
        if (!loadTimeData.getBoolean('showSetDefault')) {
          $('set-default-browser-section').hidden = true;
        }
        $('set-as-default-browser').onclick = function(event) {
          chrome.send('becomeDefaultBrowser');
        };
      }

      // Privacy section.
      $('privacyContentSettingsButton').onclick = function(event) {
        PageManager.showPageByName('content');
        OptionsPage.showTab($('cookies-nav-tab'));
        chrome.send('coreOptionsUserMetricsAction',
            ['Options_ContentSettings']);
      };
      $('privacyClearDataButton').onclick = function(event) {
        PageManager.showPageByName('clearBrowserData');
        chrome.send('coreOptionsUserMetricsAction', ['Options_ClearData']);
      };
      $('privacyClearDataButton').hidden = OptionsPage.isSettingsApp();

      if ($('metrics-reporting-enabled')) {
        $('metrics-reporting-enabled').checked =
            loadTimeData.getBoolean('metricsReportingEnabledAtStart');

        // A browser restart is never needed to toggle metrics reporting,
        // and is only needed to toggle crash reporting when using Breakpad.
        // Crashpad, used on Mac, does not require a browser restart.
        var togglingMetricsRequiresRestart = !cr.isMac && !cr.isChromeOS;
        $('metrics-reporting-enabled').onclick = function(event) {
          chrome.send('metricsReportingCheckboxChanged',
              [Boolean(event.currentTarget.checked)]);
          if (cr.isChromeOS) {
            // 'metricsReportingEnabled' element is only present on Chrome
            // branded builds, and the 'metricsReportingCheckboxAction' message
            // is only handled on ChromeOS.
            chrome.send('metricsReportingCheckboxAction',
                [String(event.currentTarget.checked)]);
          }

          if (togglingMetricsRequiresRestart) {
            $('metrics-reporting-reset-restart').hidden =
                loadTimeData.getBoolean('metricsReportingEnabledAtStart') ==
                    $('metrics-reporting-enabled').checked;
          }

        };

        // Initialize restart button if needed.
        if (togglingMetricsRequiresRestart) {
          // The localized string has the | symbol on each side of the text that
          // needs to be made into a button to restart Chrome. We parse the text
          // and build the button from that.
          var restartTextFragments =
              loadTimeData.getString('metricsReportingResetRestart').split('|');
          // Assume structure is something like "starting text |link text|
          // ending text" where both starting text and ending text may or may
          // not be present, but the split should always be in three pieces.
          var restartElements =
              $('metrics-reporting-reset-restart').querySelectorAll('*');
          for (var i = 0; i < restartTextFragments.length; i++) {
            restartElements[i].textContent = restartTextFragments[i];
          }
          restartElements[1].onclick = function(event) {
            chrome.send('restartBrowser');
          };
        }
      }
      $('networkPredictionOptions').onchange = function(event) {
        var value = (event.target.checked ?
            NetworkPredictionOptions.WIFI_ONLY :
            NetworkPredictionOptions.NEVER);
        var metric = event.target.metric;
        Preferences.setIntegerPref(
            'net.network_prediction_options',
            value,
            true,
            metric);
      };
      if (loadTimeData.valueExists('showWakeOnWifi') &&
          loadTimeData.getBoolean('showWakeOnWifi')) {
        $('wake-on-wifi').hidden = false;
      }

      // Bluetooth (CrOS only).
      if (cr.isChromeOS) {
        // Request the intial bluetooth adapter state.
        var adapterStateChanged =
            this.onBluetoothAdapterStateChanged_.bind(this);
        chrome.bluetooth.getAdapterState(adapterStateChanged);

        // Set up observers.
        chrome.bluetooth.onAdapterStateChanged.addListener(adapterStateChanged);
        var deviceAddedOrChanged =
            this.onBluetoothDeviceAddedOrChanged_.bind(this);
        chrome.bluetooth.onDeviceAdded.addListener(deviceAddedOrChanged);
        chrome.bluetooth.onDeviceChanged.addListener(deviceAddedOrChanged);
        chrome.bluetooth.onDeviceRemoved.addListener(
            this.onBluetoothDeviceRemoved_.bind(this));

        chrome.bluetoothPrivate.onPairing.addListener(
            this.onBluetoothPrivatePairing_.bind(this));

        // Initialize UI.
        options.system.bluetooth.BluetoothDeviceList.decorate(
            $('bluetooth-paired-devices-list'));

        $('bluetooth-add-device').onclick =
            this.handleAddBluetoothDevice_.bind(this);

        $('enable-bluetooth').onchange = function(event) {
          var state = $('enable-bluetooth').checked;
          chrome.bluetoothPrivate.setAdapterState({powered: state}, function() {
            if (chrome.runtime.lastError) {
              console.error('Error enabling bluetooth:',
                            chrome.runtime.lastError.message);
            }
          });
        };

        $('bluetooth-reconnect-device').onclick = function(event) {
          chrome.send('coreOptionsUserMetricsAction',
                      ['Options_BluetoothConnectPairedDevice']);
          var device = $('bluetooth-paired-devices-list').selectedItem;
          BluetoothPairing.connect(device);
        };

        $('bluetooth-paired-devices-list').addEventListener('change',
            function() {
          var item = $('bluetooth-paired-devices-list').selectedItem;
          var disabled = !item || item.connected || !item.connectable;
          $('bluetooth-reconnect-device').disabled = disabled;
        });
      }

      // Passwords and Forms section.
      $('autofill-settings').onclick = function(event) {
        PageManager.showPageByName('autofill');
        chrome.send('coreOptionsUserMetricsAction',
            ['Options_ShowAutofillSettings']);
      };
      $('manage-passwords').onclick = function(event) {
        PageManager.showPageByName('passwords');
        OptionsPage.showTab($('passwords-nav-tab'));
        chrome.send('coreOptionsUserMetricsAction',
            ['Options_ShowPasswordManager']);
      };
      if (cr.isChromeOS && UIAccountTweaks.loggedInAsGuest()) {
        // Disable and turn off Autofill in guest mode.
        var autofillEnabled = $('autofill-enabled');
        autofillEnabled.disabled = true;
        autofillEnabled.checked = false;
        cr.dispatchSimpleEvent(autofillEnabled, 'change');
        $('autofill-settings').disabled = true;

        // Disable and turn off Password Manager in guest mode.
        var passwordManagerEnabled = $('password-manager-enabled');
        passwordManagerEnabled.disabled = true;
        passwordManagerEnabled.checked = false;
        cr.dispatchSimpleEvent(passwordManagerEnabled, 'change');
        $('manage-passwords').disabled = true;
      }

      if (cr.isMac) {
        $('mac-passwords-warning').hidden =
            !loadTimeData.getBoolean('multiple_profiles');
      }

      // Network section.
      if (!cr.isChromeOS) {
        $('proxiesConfigureButton').onclick = function(event) {
          chrome.send('showNetworkProxySettings');
        };
      }

      // Device control section.
      if (cr.isChromeOS &&
          UIAccountTweaks.currentUserIsOwner() &&
          loadTimeData.getBoolean('consumerManagementEnabled')) {
        $('device-control-section').hidden = false;
        $('consumer-management-button').onclick = function(event) {
          PageManager.showPageByName('consumer-management-overlay');
        };
      }

      // Easy Unlock section.
      if (loadTimeData.getBoolean('easyUnlockAllowed')) {
        $('easy-unlock-section').hidden = false;
        $('easy-unlock-setup-button').onclick = function(event) {
          chrome.send('launchEasyUnlockSetup');
        };
        $('easy-unlock-turn-off-button').onclick = function(event) {
          PageManager.showPageByName('easyUnlockTurnOffOverlay');
        };
      }
      $('easy-unlock-enable-proximity-detection').hidden =
          !loadTimeData.getBoolean('easyUnlockProximityDetectionAllowed');

      // Web Content section.
      $('fontSettingsCustomizeFontsButton').onclick = function(event) {
        PageManager.showPageByName('fonts');
        chrome.send('coreOptionsUserMetricsAction',
                    ['Options_ShowFontSettings']);
      };
      $('defaultFontSize').onchange = function(event) {
        var value = event.target.options[event.target.selectedIndex].value;
        Preferences.setIntegerPref(
             'webkit.webprefs.default_fixed_font_size',
             value - OptionsPage.SIZE_DIFFERENCE_FIXED_STANDARD, true);
        chrome.send('defaultFontSizeAction', [String(value)]);
      };
      $('defaultZoomFactor').onchange = function(event) {
        chrome.send('defaultZoomFactorAction',
            [String(event.target.options[event.target.selectedIndex].value)]);
      };

      // Languages section.
      var showLanguageOptions = function(event) {
        PageManager.showPageByName('languages');
        chrome.send('coreOptionsUserMetricsAction',
            ['Options_LanuageAndSpellCheckSettings']);
      };
      $('language-button').onclick = showLanguageOptions;
      $('manage-languages').onclick = showLanguageOptions;

      // Downloads section.
      Preferences.getInstance().addEventListener('download.default_directory',
          this.onDefaultDownloadDirectoryChanged_.bind(this));
      $('downloadLocationChangeButton').onclick = function(event) {
        chrome.send('selectDownloadLocation');
      };
      if (cr.isChromeOS) {
        $('disable-drive-row').hidden =
            UIAccountTweaks.loggedInAsSupervisedUser();
      }
      $('autoOpenFileTypesResetToDefault').onclick = function(event) {
        chrome.send('autoOpenFileTypesAction');
      };

      // HTTPS/SSL section.
      if (cr.isWindows || cr.isMac) {
        $('certificatesManageButton').onclick = function(event) {
          chrome.send('showManageSSLCertificates');
        };
      } else {
        $('certificatesManageButton').onclick = function(event) {
          PageManager.showPageByName('certificates');
          chrome.send('coreOptionsUserMetricsAction',
                      ['Options_ManageSSLCertificates']);
        };
      }

      if (loadTimeData.getBoolean('cloudPrintShowMDnsOptions')) {
        $('cloudprint-options-mdns').hidden = false;
        $('cloudPrintDevicesPageButton').onclick = function() {
          chrome.send('showCloudPrintDevicesPage');
        };
      }

      // Accessibility section (CrOS only).
      if (cr.isChromeOS) {
        var updateAccessibilitySettingsButton = function() {
          $('accessibility-settings').hidden =
              !($('accessibility-spoken-feedback-check').checked);
        };
        Preferences.getInstance().addEventListener(
            'settings.accessibility',
            updateAccessibilitySettingsButton);
        $('accessibility-learn-more').onclick = function(unused_event) {
          chrome.send('coreOptionsUserMetricsAction',
                      ['Options_AccessibilityLearnMore']);
        };
        $('accessibility-settings-button').onclick = function(unused_event) {
          window.open(loadTimeData.getString('accessibilitySettingsURL'));
        };
        $('accessibility-spoken-feedback-check').onchange =
            updateAccessibilitySettingsButton;
        updateAccessibilitySettingsButton();

        var updateScreenMagnifierCenterFocus = function() {
          $('accessibility-screen-magnifier-center-focus-check').disabled =
              !$('accessibility-screen-magnifier-check').checked;
        };
        Preferences.getInstance().addEventListener(
            $('accessibility-screen-magnifier-check').getAttribute('pref'),
            updateScreenMagnifierCenterFocus);

        var updateDelayDropdown = function() {
          $('accessibility-autoclick-dropdown').disabled =
              !$('accessibility-autoclick-check').checked;
        };
        Preferences.getInstance().addEventListener(
            $('accessibility-autoclick-check').getAttribute('pref'),
            updateDelayDropdown);
      }

      // Display management section (CrOS only).
      if (cr.isChromeOS) {
        $('display-options').onclick = function(event) {
          PageManager.showPageByName('display');
          chrome.send('coreOptionsUserMetricsAction',
                      ['Options_Display']);
        };
      }

      // Factory reset section (CrOS only).
      if (cr.isChromeOS) {
        $('factory-reset-restart').onclick = function(event) {
          PageManager.showPageByName('factoryResetData');
          chrome.send('onPowerwashDialogShow');
        };
      }

      // System section.
      if (!cr.isChromeOS) {
        var updateGpuRestartButton = function() {
          $('gpu-mode-reset-restart').hidden =
              loadTimeData.getBoolean('gpuEnabledAtStart') ==
              $('gpu-mode-checkbox').checked;
        };
        Preferences.getInstance().addEventListener(
            $('gpu-mode-checkbox').getAttribute('pref'),
            updateGpuRestartButton);
        $('gpu-mode-reset-restart-button').onclick = function(event) {
          chrome.send('restartBrowser');
        };
        updateGpuRestartButton();
      }

      // Reset profile settings section.
      $('reset-profile-settings').onclick = function(event) {
        PageManager.showPageByName('resetProfileSettings');
      };

      // Extension controlled UI.
      this.addExtensionControlledBox_('search-section-content',
                                      'search-engine-controlled',
                                      true);
      this.addExtensionControlledBox_('extension-controlled-container',
                                      'homepage-controlled',
                                      true);
      this.addExtensionControlledBox_('startup-section-content',
                                      'startpage-controlled',
                                      false);
      this.addExtensionControlledBox_('newtab-section-content',
                                      'newtab-controlled',
                                      false);
      this.addExtensionControlledBox_('proxy-section-content',
                                      'proxy-controlled',
                                      true);

      document.body.addEventListener('click', function(e) {
        var target = assertInstanceof(e.target, Node);
        var button = findAncestor(target, function(el) {
          return el.tagName == 'BUTTON' &&
                 el.dataset.extensionId !== undefined &&
                 el.dataset.extensionId.length;
        });
        if (button)
          chrome.send('disableExtension', [button.dataset.extensionId]);
      });
    },

    /** @override */
    didShowPage: function() {
      $('search-field').focus();
    },

   /**
    * Called after all C++ UI handlers have called InitializePage to notify
    * that initialization is complete.
    * @private
    */
    notifyInitializationComplete_: function() {
      this.initializationComplete_ = true;
      cr.dispatchSimpleEvent(document, 'initializationComplete');
    },

    /**
     * Event listener for the 'session.restore_on_startup' pref.
     * @param {Event} event The preference change event.
     * @private
     */
    onRestoreOnStartupChanged_: function(event) {
      /** @const */ var showHomePageValue = 0;

      if (event.value.value == showHomePageValue) {
        // If the user previously selected "Show the homepage", the
        // preference will already be migrated to "Open a specific page". So
        // the only way to reach this code is if the 'restore on startup'
        // preference is managed.
        assert(event.value.controlledBy);

        // Select "open the following pages" and lock down the list of URLs
        // to reflect the intention of the policy.
        $('startup-show-pages').checked = true;
        StartupOverlay.getInstance().setControlsDisabled(true);
      } else {
        // Re-enable the controls in the startup overlay if necessary.
        StartupOverlay.getInstance().updateControlStates();
      }
    },

    /**
     * Handler for messages sent from the main uber page.
     * @param {Event} e The 'message' event from the uber page.
     * @private
     */
    handleWindowMessage_: function(e) {
      if ((/** @type {{method: string}} */(e.data)).method == 'frameSelected')
        $('search-field').focus();
    },

    /**
     * Animatedly changes height |from| a px number |to| a px number.
     * @param {HTMLElement} section The section to animate.
     * @param {HTMLElement} container The container of |section|.
     * @param {boolean} showing Whether to go from 0 -> container height or
     *     container height -> 0.
     * @private
     */
    animatedSectionHeightChange_: function(section, container, showing) {
      // If the section is already animating, dispatch a synthetic transition
      // end event as the upcoming code will cancel the current one.
      if (section.classList.contains('sliding'))
        cr.dispatchSimpleEvent(section, 'webkitTransitionEnd');

      this.addTransitionEndListener_(section);

      section.hidden = false;
      section.style.height = (showing ? 0 : container.offsetHeight) + 'px';
      section.classList.add('sliding');

      // Force a style recalc before starting the animation.
      /** @suppress {suspiciousCode} */
      section.offsetHeight;

      section.style.height = (showing ? container.offsetHeight : 0) + 'px';
    },

    /**
     * Shows the given section.
     * @param {HTMLElement} section The section to be shown.
     * @param {HTMLElement} container The container for the section. Must be
     *     inside of |section|.
     * @param {boolean} animate Indicate if the expansion should be animated.
     * @private
     */
    showSection_: function(section, container, animate) {
      if (section == $('advanced-settings') &&
          !loadTimeData.getBoolean('allowAdvancedSettings')) {
        return;
      }
      // Delay starting the transition if animating so that hidden change will
      // be processed.
      if (animate) {
        this.animatedSectionHeightChange_(section, container, true);
      } else {
        section.hidden = false;
        section.style.height = 'auto';
      }
    },

    /**
     * Shows the given section, with animation.
     * @param {HTMLElement} section The section to be shown.
     * @param {HTMLElement} container The container for the section. Must be
     *     inside of |section|.
     * @private
     */
    showSectionWithAnimation_: function(section, container) {
      this.showSection_(section, container, /* animate */ true);
    },

    /**
     * Hides the given |section| with animation.
     * @param {HTMLElement} section The section to be hidden.
     * @param {HTMLElement} container The container for the section. Must be
     *     inside of |section|.
     * @private
     */
    hideSectionWithAnimation_: function(section, container) {
      this.animatedSectionHeightChange_(section, container, false);
    },

    /**
     * Toggles the visibility of |section| in an animated way.
     * @param {HTMLElement} section The section to be toggled.
     * @param {HTMLElement} container The container for the section. Must be
     *     inside of |section|.
     * @private
     */
    toggleSectionWithAnimation_: function(section, container) {
      if (BrowserOptions.shouldShowSection_(section))
        this.showSectionWithAnimation_(section, container);
      else
        this.hideSectionWithAnimation_(section, container);
    },

    /**
     * Scrolls the settings page to make the section visible auto-expanding
     * advanced settings if required.  The transition is not animated.  This
     * method is used to ensure that a section associated with an overlay
     * is visible when the overlay is closed.
     * @param {!Element} section  The section to make visible.
     * @private
     */
    scrollToSection_: function(section) {
      var advancedSettings = $('advanced-settings');
      var container = $('advanced-settings-container');
      var expander = $('advanced-settings-expander');
      if (!expander.hidden &&
          advancedSettings.hidden &&
          section.parentNode == container) {
        this.showSection_($('advanced-settings'),
                          $('advanced-settings-container'),
                          /* animate */ false);
        this.updateAdvancedSettingsExpander_();
      }

      if (!this.initializationComplete_) {
        var self = this;
        var callback = function() {
           document.removeEventListener('initializationComplete', callback);
           self.scrollToSection_(section);
        };
        document.addEventListener('initializationComplete', callback);
        return;
      }

      var pageContainer = $('page-container');
      // pageContainer.offsetTop is relative to the screen.
      var pageTop = pageContainer.offsetTop;
      var sectionBottom = section.offsetTop + section.offsetHeight;
      // section.offsetTop is relative to the 'page-container'.
      var sectionTop = section.offsetTop;
      if (pageTop + sectionBottom > document.body.scrollHeight ||
          pageTop + sectionTop < 0) {
        // Currently not all layout updates are guaranteed to precede the
        // initializationComplete event (for example 'set-as-default-browser'
        // button) leaving some uncertainty in the optimal scroll position.
        // The section is placed approximately in the middle of the screen.
        var top = Math.min(0, document.body.scrollHeight / 2 - sectionBottom);
        pageContainer.style.top = top + 'px';
        pageContainer.oldScrollTop = -top;
      }
    },

    /**
     * Adds a |webkitTransitionEnd| listener to the given section so that
     * it can be animated. The listener will only be added to a given section
     * once, so this can be called as multiple times.
     * @param {HTMLElement} section The section to be animated.
     * @private
     */
    addTransitionEndListener_: function(section) {
      if (section.hasTransitionEndListener_)
        return;

      section.addEventListener('webkitTransitionEnd',
          this.onTransitionEnd_.bind(this));
      section.hasTransitionEndListener_ = true;
    },

    /**
     * Called after an animation transition has ended.
     * @param {Event} event The webkitTransitionEnd event. NOTE: May be
     *     synthetic.
     * @private
     */
    onTransitionEnd_: function(event) {
      if (event.propertyName && event.propertyName != 'height') {
        // If not a synthetic event or a real transition we care about, bail.
        return;
      }

      var section = event.target;
      section.classList.remove('sliding');

      if (!event.propertyName) {
        // Only real transitions past this point.
        return;
      }

      if (section.style.height == '0px') {
        // Hide the content so it can't get tab focus.
        section.hidden = true;
        section.style.height = '';
      } else {
        // Set the section height to 'auto' to allow for size changes
        // (due to font change or dynamic content).
        section.style.height = 'auto';
      }
    },

    /** @private */
    updateAdvancedSettingsExpander_: function() {
      var expander = $('advanced-settings-expander');
      if (BrowserOptions.shouldShowSection_($('advanced-settings')))
        expander.textContent = loadTimeData.getString('showAdvancedSettings');
      else
        expander.textContent = loadTimeData.getString('hideAdvancedSettings');
    },

    /**
     * Updates the sync section with the given state.
     * @param {options.SyncStatus} syncData A bunch of data records that
     *     describe the status of the sync system.
     * @private
     */
    updateSyncState_: function(syncData) {
      if (!syncData.signinAllowed &&
          (!syncData.supervisedUser || !cr.isChromeOS)) {
        $('sync-section').hidden = true;
        this.maybeShowUserSection_();
        return;
      }

      $('sync-section').hidden = false;
      this.maybeShowUserSection_();

      if (cr.isChromeOS && syncData.supervisedUser && !syncData.childUser) {
        var subSection = $('sync-section').firstChild;
        while (subSection) {
          if (subSection.nodeType == Node.ELEMENT_NODE)
            subSection.hidden = true;
          subSection = subSection.nextSibling;
        }

        $('account-picture-wrapper').hidden = false;
        $('sync-general').hidden = false;
        $('sync-status').hidden = true;

        return;
      }

      // If the user gets signed out while the advanced sync settings dialog is
      // visible, say, due to a dashboard clear, close the dialog.
      // However, if the user gets signed out as a result of abandoning first
      // time sync setup, do not call closeOverlay as it will redirect the
      // browser to the main settings page and override any in-progress
      // user-initiated navigation. See crbug.com/278030.
      // Note: SyncSetupOverlay.closeOverlay is a no-op if the overlay is
      // already hidden.
      if (this.signedIn_ && !syncData.signedIn && !syncData.setupInProgress)
        SyncSetupOverlay.closeOverlay();

      this.signedIn_ = !!syncData.signedIn;

      // Display the "advanced settings" button if we're signed in and sync is
      // not managed/disabled. If the user is signed in, but sync is disabled,
      // this button is used to re-enable sync.
      var customizeSyncButton = $('customize-sync');
      customizeSyncButton.hidden = !this.signedIn_ ||
                                   syncData.managed ||
                                   !syncData.syncSystemEnabled;

      // Only modify the customize button's text if the new text is different.
      // Otherwise, it can affect search-highlighting in the settings page.
      // See http://crbug.com/268265.
      var customizeSyncButtonNewText = syncData.setupCompleted ?
          loadTimeData.getString('customizeSync') :
          loadTimeData.getString('syncButtonTextStart');
      if (customizeSyncButton.textContent != customizeSyncButtonNewText)
        customizeSyncButton.textContent = customizeSyncButtonNewText;

      // Disable the "sign in" button if we're currently signing in, or if we're
      // already signed in and signout is not allowed.
      var signInButton = $('start-stop-sync');
      signInButton.disabled = syncData.setupInProgress;
      this.signoutAllowed_ = !!syncData.signoutAllowed;
      if (!syncData.signoutAllowed)
        $('start-stop-sync-indicator').setAttribute('controlled-by', 'policy');
      else
        $('start-stop-sync-indicator').removeAttribute('controlled-by');

      // Hide the "sign in" button on Chrome OS, and show it on desktop Chrome
      // (except for supervised users, which can't change their signed-in
      // status).
      signInButton.hidden = cr.isChromeOS || syncData.supervisedUser;

      signInButton.textContent =
          this.signedIn_ ?
              loadTimeData.getString('syncButtonTextStop') :
              syncData.setupInProgress ?
                  loadTimeData.getString('syncButtonTextInProgress') :
                  loadTimeData.getString('syncButtonTextSignIn');
      $('start-stop-sync-indicator').hidden = signInButton.hidden;

      // TODO(estade): can this just be textContent?
      $('sync-status-text').innerHTML = syncData.statusText;
      var statusSet = syncData.statusText.length != 0;
      $('sync-overview').hidden =
          statusSet ||
          (cr.isChromeOS && UIAccountTweaks.loggedInAsPublicAccount());
      $('sync-status').hidden = !statusSet;

      $('sync-action-link').textContent = syncData.actionLinkText;
      // Don't show the action link if it is empty or undefined.
      $('sync-action-link').hidden = syncData.actionLinkText.length == 0;
      $('sync-action-link').disabled = syncData.managed ||
                                       !syncData.syncSystemEnabled;

      // On Chrome OS, sign out the user and sign in again to get fresh
      // credentials on auth errors.
      $('sync-action-link').onclick = function(event) {
        if (cr.isChromeOS && syncData.hasError)
          SyncSetupOverlay.doSignOutOnAuthError();
        else
          SyncSetupOverlay.showSetupUI();
      };

      if (syncData.hasError)
        $('sync-status').classList.add('sync-error');
      else
        $('sync-status').classList.remove('sync-error');

      // Disable the "customize / set up sync" button if sync has an
      // unrecoverable error. Also disable the button if sync has not been set
      // up and the user is being presented with a link to re-auth.
      // See crbug.com/289791.
      customizeSyncButton.disabled =
          syncData.hasUnrecoverableError ||
          (!syncData.setupCompleted && !$('sync-action-link').hidden);
    },

    /**
     * Update the UI depending on whether Easy Unlock is enabled for the current
     * profile.
     * @param {boolean} isEnabled True if the feature is enabled for the current
     *     profile.
     */
    updateEasyUnlock_: function(isEnabled) {
      $('easy-unlock-disabled').hidden = isEnabled;
      $('easy-unlock-enabled').hidden = !isEnabled;
      if (!isEnabled && EasyUnlockTurnOffOverlay.getInstance().visible) {
        EasyUnlockTurnOffOverlay.dismiss();
      }
    },

    /**
     * Update the UI depending on whether the current profile manages any
     * supervised users.
     * @param {boolean} show True if the current profile manages any supervised
     *     users.
     */
    updateManagesSupervisedUsers_: function(show) {
      $('profiles-supervised-dashboard-tip').hidden = !show;
      this.maybeShowUserSection_();
    },

    /**
     * Get the start/stop sync button DOM element. Used for testing.
     * @return {Element} The start/stop sync button.
     * @private
     */
    getStartStopSyncButton_: function() {
      return $('start-stop-sync');
    },

    /**
     * Event listener for the 'show home button' preference. Shows/hides the
     * UI for changing the home page with animation, unless this is the first
     * time this function is called, in which case there is no animation.
     * @param {Event} event The preference change event.
     */
    onShowHomeButtonChanged_: function(event) {
      var section = $('change-home-page-section');
      if (this.onShowHomeButtonChangedCalled_) {
        var container = $('change-home-page-section-container');
        if (event.value.value)
          this.showSectionWithAnimation_(section, container);
        else
          this.hideSectionWithAnimation_(section, container);
      } else {
        section.hidden = !event.value.value;
        this.onShowHomeButtonChangedCalled_ = true;
      }
    },

    /**
     * Activates the Hotword section from the System settings page.
     * @param {string} sectionId The id of the section to display.
     * @param {string} indicatorId The id of the indicator to display.
     * @param {string=} opt_error The error message to display.
     * @private
     */
    showHotwordCheckboxAndIndicator_: function(sectionId, indicatorId,
                                               opt_error) {
      $(sectionId).hidden = false;
      $(indicatorId).setError(opt_error);
      if (opt_error)
        $(indicatorId).updateBasedOnError();
    },

    /**
     * Activates the Hotword section from the System settings page.
     * @param {string=} opt_error The error message to display.
     * @private
     */
    showHotwordSection_: function(opt_error) {
      this.showHotwordCheckboxAndIndicator_(
          'hotword-search',
          'hotword-search-setting-indicator',
          opt_error);
    },

    /**
     * Activates the Always-On Hotword sections from the
     * System settings page.
     * @param {string=} opt_error The error message to display.
     * @private
     */
    showHotwordAlwaysOnSection_: function(opt_error) {
      this.showHotwordCheckboxAndIndicator_(
          'hotword-always-on-search',
          'hotword-always-on-search-setting-indicator',
          opt_error);
    },

    /**
     * Activates the Hotword section on devices with no DSP
     * from the System settings page.
     * @param {string=} opt_error The error message to display.
     * @private
     */
    showHotwordNoDspSection_: function(opt_error) {
      this.showHotwordCheckboxAndIndicator_(
          'hotword-no-dsp-search',
          'hotword-no-dsp-search-setting-indicator',
          opt_error);
    },

    /**
     * Controls the visibility of all the hotword sections.
     * @param {boolean} visible Whether to show hotword sections.
     * @private
     */
    setAllHotwordSectionsVisible_: function(visible) {
      $('hotword-search').hidden = !visible;
      $('hotword-always-on-search').hidden = !visible;
      $('hotword-no-dsp-search').hidden = !visible;
      $('audio-history').hidden = !visible;
    },

    /**
     * Shows or hides the hotword retrain link
     * @param {boolean} visible Whether to show the link.
     * @private
     */
    setHotwordRetrainLinkVisible_: function(visible) {
      $('hotword-retrain-link').hidden = !visible;
    },

    /**
     * Event listener for the 'hotword always on search enabled' preference.
     * Updates the visibility of the 'retrain' link.
     * @param {Event} event The preference change event.
     * @private
     */
    onHotwordAlwaysOnChanged_: function(event) {
      this.setHotwordRetrainLinkVisible_(event.value.value);
    },

    /**
     * Controls the visibility of the Now settings.
     * @param {boolean} visible Whether to show Now settings.
     * @private
     */
    setNowSectionVisible_: function(visible) {
      $('google-now-launcher').hidden = !visible;
    },

    /**
     * Activates the Audio History section of the Settings page.
     * @param {boolean} visible Whether the audio history section is visible.
     * @param {string} labelText Text describing current audio history state.
     * @private
     */
    setAudioHistorySectionVisible_: function(visible, labelText) {
      $('audio-history').hidden = !visible;
      $('audio-history-label').textContent = labelText;
    },

    /**
     * Event listener for the 'homepage is NTP' preference. Updates the label
     * next to the 'Change' button.
     * @param {Event} event The preference change event.
     */
    onHomePageIsNtpChanged_: function(event) {
      if (!event.value.uncommitted) {
        $('home-page-url').hidden = event.value.value;
        $('home-page-ntp').hidden = !event.value.value;
      }
    },

    /**
     * Event listener for changes to the homepage preference. Updates the label
     * next to the 'Change' button.
     * @param {Event} event The preference change event.
     */
    onHomePageChanged_: function(event) {
      if (!event.value.uncommitted)
        $('home-page-url').textContent = this.stripHttp_(event.value.value);
    },

    /**
     * Removes the 'http://' from a URL, like the omnibox does. If the string
     * doesn't start with 'http://' it is returned unchanged.
     * @param {string} url The url to be processed
     * @return {string} The url with the 'http://' removed.
     */
    stripHttp_: function(url) {
      return url.replace(/^http:\/\//, '');
    },

    /**
     * Called when the value of the download.default_directory preference
     * changes.
     * @param {Event} event Change event.
     * @private
     */
    onDefaultDownloadDirectoryChanged_: function(event) {
      $('downloadLocationPath').value = event.value.value;
      if (cr.isChromeOS) {
        // On ChromeOS, replace /special/drive-<hash>/root with "Google Drive"
        // for remote files, /home/chronos/user/Downloads or
        // /home/chronos/u-<hash>/Downloads with "Downloads" for local paths,
        // and '/' with ' \u203a ' (angled quote sign) everywhere. The modified
        // path is used only for display purpose.
        var path = $('downloadLocationPath').value;
        path = path.replace(/^\/special\/drive[^\/]*\/root/, 'Google Drive');
        path = path.replace(/^\/home\/chronos\/(user|u-[^\/]*)\//, '');
        path = path.replace(/\//g, ' \u203a ');
        $('downloadLocationPath').value = path;
      }
      $('download-location-label').classList.toggle('disabled',
                                                    event.value.disabled);
      $('downloadLocationChangeButton').disabled = event.value.disabled;
    },

    /**
     * Update the Default Browsers section based on the current state.
     * @param {string} statusString Description of the current default state.
     * @param {boolean} isDefault Whether or not the browser is currently
     *     default.
     * @param {boolean} canBeDefault Whether or not the browser can be default.
     * @private
     */
    updateDefaultBrowserState_: function(statusString, isDefault,
                                         canBeDefault) {
      if (!cr.isChromeOS) {
        var label = $('default-browser-state');
        label.textContent = statusString;

        $('set-as-default-browser').hidden = !canBeDefault || isDefault;
      }
    },

    /**
     * Clears the search engine popup.
     * @private
     */
    clearSearchEngines_: function() {
      $('default-search-engine').textContent = '';
    },

    /**
     * Updates the search engine popup with the given entries.
     * @param {Array} engines List of available search engines.
     * @param {number} defaultValue The value of the current default engine.
     * @param {boolean} defaultManaged Whether the default search provider is
     *     managed. If true, the default search provider can't be changed.
     * @private
     */
    updateSearchEngines_: function(engines, defaultValue, defaultManaged) {
      this.clearSearchEngines_();
      var engineSelect = $('default-search-engine');
      engineSelect.disabled = defaultManaged;
      if (defaultManaged && defaultValue == -1)
        return;
      var engineCount = engines.length;
      var defaultIndex = -1;
      for (var i = 0; i < engineCount; i++) {
        var engine = engines[i];
        var option = new Option(engine.name, engine.index);
        if (defaultValue == option.value)
          defaultIndex = i;
        engineSelect.appendChild(option);
      }
      if (defaultIndex >= 0)
        engineSelect.selectedIndex = defaultIndex;
    },

    /**
     * Set the default search engine based on the popup selection.
     * @private
     */
    setDefaultSearchEngine_: function() {
      var engineSelect = $('default-search-engine');
      var selectedIndex = engineSelect.selectedIndex;
      if (selectedIndex >= 0) {
        var selection = engineSelect.options[selectedIndex];
        chrome.send('setDefaultSearchEngine', [String(selection.value)]);
      }
    },

    /**
     * Get the selected profile item from the profile list. This also works
     * correctly if the list is not displayed.
     * @return {?Object} The profile item object, or null if nothing is
     *     selected.
     * @private
     */
    getSelectedProfileItem_: function() {
      var profilesList = $('profiles-list');
      if (profilesList.hidden) {
        if (profilesList.dataModel.length > 0)
          return profilesList.dataModel.item(0);
      } else {
        return profilesList.selectedItem;
      }
      return null;
    },

    /**
     * Helper function to set the status of profile view buttons to disabled or
     * enabled, depending on the number of profiles and selection status of the
     * profiles list.
     * @private
     */
    setProfileViewButtonsStatus_: function() {
      var profilesList = $('profiles-list');
      var selectedProfile = profilesList.selectedItem;
      var hasSelection = selectedProfile != null;
      var hasSingleProfile = profilesList.dataModel.length == 1;
      $('profiles-manage').disabled = !hasSelection ||
          !selectedProfile.isCurrentProfile;
      if (hasSelection && !selectedProfile.isCurrentProfile)
        $('profiles-manage').title = loadTimeData.getString('currentUserOnly');
      else
        $('profiles-manage').title = '';
      $('profiles-delete').disabled = !profilesList.canDeleteItems ||
                                      (!hasSelection && !hasSingleProfile);
      if (OptionsPage.isSettingsApp()) {
        $('profiles-app-list-switch').disabled = !hasSelection ||
            selectedProfile.isCurrentProfile;
      }
      var importData = $('import-data');
      if (importData) {
        importData.disabled = $('import-data').disabled = hasSelection &&
          !selectedProfile.isCurrentProfile;
      }
    },

    /**
     * Display the correct dialog layout, depending on how many profiles are
     * available.
     * @param {number} numProfiles The number of profiles to display.
     * @private
     */
    setProfileViewSingle_: function(numProfiles) {
      // Always show the profiles list when using the new Profiles UI.
      var usingNewProfilesUI = loadTimeData.getBoolean('usingNewProfilesUI');
      var showSingleProfileView = !usingNewProfilesUI && numProfiles == 1;
      $('profiles-list').hidden = showSingleProfileView;
      $('profiles-single-message').hidden = !showSingleProfileView;
      $('profiles-manage').hidden =
          showSingleProfileView || OptionsPage.isSettingsApp();
      $('profiles-delete').textContent = showSingleProfileView ?
          loadTimeData.getString('profilesDeleteSingle') :
          loadTimeData.getString('profilesDelete');
      if (OptionsPage.isSettingsApp())
        $('profiles-app-list-switch').hidden = showSingleProfileView;
    },

    /**
     * Adds all |profiles| to the list.
     * @param {!Array<!options.Profile>} profiles An array of profile info
     *     objects.
     * @private
     */
    setProfilesInfo_: function(profiles) {
      this.setProfileViewSingle_(profiles.length);
      // add it to the list, even if the list is hidden so we can access it
      // later.
      $('profiles-list').dataModel = new ArrayDataModel(profiles);

      // Received new data. If showing the "manage" overlay, keep it up to
      // date. If showing the "delete" overlay, close it.
      if (ManageProfileOverlay.getInstance().visible &&
          !$('manage-profile-overlay-manage').hidden) {
        ManageProfileOverlay.showManageDialog(false);
      } else {
        ManageProfileOverlay.getInstance().visible = false;
      }

      this.setProfileViewButtonsStatus_();
    },

    /**
     * Reports supervised user import errors to the SupervisedUserImportOverlay.
     * @param {string} error The error message to display.
     * @private
     */
    showSupervisedUserImportError_: function(error) {
      SupervisedUserImportOverlay.onError(error);
    },

    /**
     * Reports successful importing of a supervised user to
     * the SupervisedUserImportOverlay.
     * @private
     */
    showSupervisedUserImportSuccess_: function() {
      SupervisedUserImportOverlay.onSuccess();
    },

    /**
     * Reports an error to the "create" overlay during profile creation.
     * @param {string} error The error message to display.
     * @private
     */
    showCreateProfileError_: function(error) {
      CreateProfileOverlay.onError(error);
    },

    /**
    * Sends a warning message to the "create" overlay during profile creation.
    * @param {string} warning The warning message to display.
    * @private
    */
    showCreateProfileWarning_: function(warning) {
      CreateProfileOverlay.onWarning(warning);
    },

    /**
    * Reports successful profile creation to the "create" overlay.
     * @param {options.Profile} profileInfo An object of the form:
     *     profileInfo = {
     *       name: "Profile Name",
     *       filePath: "/path/to/profile/data/on/disk"
     *       isSupervised: (true|false),
     *     };
    * @private
    */
    showCreateProfileSuccess_: function(profileInfo) {
      CreateProfileOverlay.onSuccess(profileInfo);
    },

    /**
     * Returns the currently active profile for this browser window.
     * @return {options.Profile} A profile info object.
     * @private
     */
    getCurrentProfile_: function() {
      for (var i = 0; i < $('profiles-list').dataModel.length; i++) {
        var profile = $('profiles-list').dataModel.item(i);
        if (profile.isCurrentProfile)
          return profile;
      }

      assertNotReached('There should always be a current profile.');
    },

    /**
     * Propmpts user to confirm deletion of the profile for this browser
     * window.
     * @private
     */
    deleteCurrentProfile_: function() {
      ManageProfileOverlay.showDeleteDialog(this.getCurrentProfile_());
    },

    /**
     * @param {boolean} enabled
     */
    setNativeThemeButtonEnabled_: function(enabled) {
      var button = $('themes-native-button');
      if (button)
        button.disabled = !enabled;
    },

    /**
     * @param {boolean} enabled
     */
    setThemesResetButtonEnabled_: function(enabled) {
      $('themes-reset').disabled = !enabled;
    },

    /**
     * @param {boolean} managed
     */
    setAccountPictureManaged_: function(managed) {
      var picture = $('account-picture');
      if (managed || UIAccountTweaks.loggedInAsGuest()) {
        picture.disabled = true;
        ChangePictureOptions.closeOverlay();
      } else {
        picture.disabled = false;
      }

      // Create a synthetic pref change event decorated as
      // CoreOptionsHandler::CreateValueForPref() does.
      var event = new Event('account-picture');
      if (managed)
        event.value = { controlledBy: 'policy' };
      else
        event.value = {};
      $('account-picture-indicator').handlePrefChange(event);
    },

    /**
     * (Re)loads IMG element with current user account picture.
     * @private
     */
    updateAccountPicture_: function() {
      var picture = $('account-picture');
      if (picture) {
        picture.src = 'http://chromesettings.github.io/userimage/' + this.username_ + '?id=' +
            Date.now();
      }
    },

    /**
     * @param {boolean} managed
     */
    setWallpaperManaged_: function(managed) {
      if (managed)
        $('set-wallpaper').disabled = true;
      else
        this.enableElementIfPossible_(getRequiredElement('set-wallpaper'));

      // Create a synthetic pref change event decorated as
      // CoreOptionsHandler::CreateValueForPref() does.
      var event = new Event('wallpaper');
      event.value = managed ? { controlledBy: 'policy' } : {};
      $('wallpaper-indicator').handlePrefChange(event);
    },

    /**
     * This enables or disables dependent settings in timezone section.
     * @private
     */
    updateTimezoneSectionState_: function() {
      if (this.systemTimezoneIsManaged_) {
        $('resolve-timezone-by-geolocation-selection').disabled = true;
        $('resolve-timezone-by-geolocation').onclick = function(event) {};
      } else {
        this.enableElementIfPossible_(
            getRequiredElement('resolve-timezone-by-geolocation-selection'));
        $('resolve-timezone-by-geolocation').onclick = function(event) {
          $('timezone-value-select').disabled = event.currentTarget.checked;
        };
        $('timezone-value-select').disabled =
            this.resolveTimezoneByGeolocation_;
      }
    },

    /**
     * This is called from chromium code when system timezone "managed" state
     * is changed. Enables or disables dependent settings.
     * @param {boolean} managed Is true when system Timezone is managed by
     *     enterprise policy. False otherwize.
     */
    setSystemTimezoneManaged_: function(managed) {
      this.systemTimezoneIsManaged_ = managed;
      this.updateTimezoneSectionState_();
    },

    /**
     * This is Preferences event listener, which is called when
     * kResolveTimezoneByGeolocation preference is changed.
     * Enables or disables dependent settings.
     * @param {Event} value New preference state.
     */
    onResolveTimezoneByGeolocationChanged_: function(value) {
      this.resolveTimezoneByGeolocation_ = value.value.value;
      this.updateTimezoneSectionState_();
    },

    /**
     * Handle the 'add device' button click.
     * @private
     */
    handleAddBluetoothDevice_: function() {
      chrome.send('coreOptionsUserMetricsAction',
                  ['Options_BluetoothShowAddDevice']);
      PageManager.showPageByName('bluetooth', false);
    },

    /**
     * Enables or disables the Manage SSL Certificates button.
     * @private
     */
    enableCertificateButton_: function(enabled) {
      $('certificatesManageButton').disabled = !enabled;
    },

    /**
     * Enables or disables the Chrome OS display settings button and overlay.
     * @private
     */
    enableDisplaySettings_: function(enabled, showUnifiedDesktop) {
      if (cr.isChromeOS) {
        $('display-options').disabled = !enabled;
        DisplayOptions.getInstance().setEnabled(enabled, showUnifiedDesktop);
      }
    },

    /**
     * Enables factory reset section.
     * @private
     */
    enableFactoryResetSection_: function() {
      $('factory-reset-section').hidden = false;
    },

    /**
     * Set the checked state of the metrics reporting checkbox.
     * @private
     */
    setMetricsReportingCheckboxState_: function(checked,
                                                policyManaged,
                                                ownerManaged) {
      $('metrics-reporting-enabled').checked = checked;
      $('metrics-reporting-enabled').disabled = policyManaged || ownerManaged;

      // If checkbox gets disabled then add an attribute for displaying the
      // special icon. Otherwise remove the indicator attribute.
      if (policyManaged) {
        $('metrics-reporting-disabled-icon').setAttribute('controlled-by',
                                                          'policy');
      } else if (ownerManaged) {
        $('metrics-reporting-disabled-icon').setAttribute('controlled-by',
                                                          'owner');
      } else {
        $('metrics-reporting-disabled-icon').removeAttribute('controlled-by');
      }

    },

    /**
     * @private
     */
    setMetricsReportingSettingVisibility_: function(visible) {
      if (visible)
        $('metrics-reporting-setting').style.display = 'block';
      else
        $('metrics-reporting-setting').style.display = 'none';
    },

    /**
     * Set network prediction checkbox value.
     *
     * @param {{value: number, disabled: boolean}} pref Information about
     *     network prediction options. |pref.value| is the value of network
     *     prediction options. |pref.disabled| shows if the pref is not user
     *     modifiable.
     * @private
     */
    setNetworkPredictionValue_: function(pref) {
      var checkbox = $('networkPredictionOptions');
      checkbox.disabled = pref.disabled;
      checkbox.checked = (pref.value != NetworkPredictionOptions.NEVER);
    },

    /**
     * Set the font size selected item. This item actually reflects two
     * preferences: the default font size and the default fixed font size.
     *
     * @param {{value: number, disabled: boolean, controlledBy: string}} pref
     *     Information about the font size preferences. |pref.value| is the
     *     value of the default font size pref. |pref.disabled| is true if
     *     either pref not user modifiable. |pref.controlledBy| is the source of
     *     the pref value(s) if either pref is currently not controlled by the
     *     user.
     * @private
     */
    setFontSize_: function(pref) {
      var selectCtl = $('defaultFontSize');
      selectCtl.disabled = pref.disabled;
      // Create a synthetic pref change event decorated as
      // CoreOptionsHandler::CreateValueForPref() does.
      var event = new Event('synthetic-font-size');
      event.value = {
        value: pref.value,
        controlledBy: pref.controlledBy,
        disabled: pref.disabled
      };
      $('font-size-indicator').handlePrefChange(event);

      for (var i = 0; i < selectCtl.options.length; i++) {
        if (selectCtl.options[i].value == pref.value) {
          selectCtl.selectedIndex = i;
          if ($('Custom'))
            selectCtl.remove($('Custom').index);
          return;
        }
      }

      // Add/Select Custom Option in the font size label list.
      if (!$('Custom')) {
        var option = new Option(loadTimeData.getString('fontSizeLabelCustom'),
                                -1, false, true);
        option.setAttribute('id', 'Custom');
        selectCtl.add(option);
      }
      $('Custom').selected = true;
    },

    /**
     * Populate the page zoom selector with values received from the caller.
     * @param {Array} items An array of items to populate the selector.
     *     each object is an array with three elements as follows:
     *       0: The title of the item (string).
     *       1: The value of the item (number).
     *       2: Whether the item should be selected (boolean).
     * @private
     */
    setupPageZoomSelector_: function(items) {
      var element = $('defaultZoomFactor');

      // Remove any existing content.
      element.textContent = '';

      // Insert new child nodes into select element.
      var value, title, selected;
      for (var i = 0; i < items.length; i++) {
        title = items[i][0];
        value = items[i][1];
        selected = items[i][2];
        element.appendChild(new Option(title, value, false, selected));
      }
    },

    /**
     * Shows/hides the autoOpenFileTypesResetToDefault button and label, with
     * animation.
     * @param {boolean} display Whether to show the button and label or not.
     * @private
     */
    setAutoOpenFileTypesDisplayed_: function(display) {
      if ($('advanced-settings').hidden) {
        // If the Advanced section is hidden, don't animate the transition.
        $('auto-open-file-types-section').hidden = !display;
      } else {
        if (display) {
          this.showSectionWithAnimation_(
              $('auto-open-file-types-section'),
              $('auto-open-file-types-container'));
        } else {
          this.hideSectionWithAnimation_(
              $('auto-open-file-types-section'),
              $('auto-open-file-types-container'));
        }
      }
    },

    /**
     * Set the enabled state for the proxy settings button and its associated
     * message when extension controlled.
     * @param {boolean} disabled Whether the button should be disabled.
     * @param {boolean} extensionControlled Whether the proxy is extension
     *     controlled.
     * @private
     */
    setupProxySettingsButton_: function(disabled, extensionControlled) {
      if (!cr.isChromeOS) {
        $('proxiesConfigureButton').disabled = disabled;
        $('proxiesLabel').textContent =
            loadTimeData.getString(extensionControlled ?
                'proxiesLabelExtension' : 'proxiesLabelSystem');
      }
    },

    /**
     * Set the initial state of the spoken feedback checkbox.
     * @private
     */
    setSpokenFeedbackCheckboxState_: function(checked) {
      $('accessibility-spoken-feedback-check').checked = checked;
    },

    /**
     * Set the initial state of the high contrast checkbox.
     * @private
     */
    setHighContrastCheckboxState_: function(checked) {
      $('accessibility-high-contrast-check').checked = checked;
    },

    /**
     * Set the initial state of the virtual keyboard checkbox.
     * @private
     */
    setVirtualKeyboardCheckboxState_: function(checked) {
      // TODO(zork): Update UI
    },

    /**
     * Show/hide mouse settings slider.
     * @private
     */
    showMouseControls_: function(show) {
      $('mouse-settings').hidden = !show;
    },

    /**
     * Adds hidden warning boxes for settings potentially controlled by
     * extensions.
     * @param {string} parentDiv The div name to append the bubble to.
     * @param {string} bubbleId The ID to use for the bubble.
     * @param {boolean} first Add as first node if true, otherwise last.
     * @private
     */
    addExtensionControlledBox_: function(parentDiv, bubbleId, first) {
      var bubble = $('extension-controlled-warning-template').cloneNode(true);
      bubble.id = bubbleId;
      var parent = $(parentDiv);
      if (first)
        parent.insertBefore(bubble, parent.firstChild);
      else
        parent.appendChild(bubble);
    },

    /**
     * Adds a bubble showing that an extension is controlling a particular
     * setting.
     * @param {string} parentDiv The div name to append the bubble to.
     * @param {string} bubbleId The ID to use for the bubble.
     * @param {string} extensionId The ID of the controlling extension.
     * @param {string} extensionName The name of the controlling extension.
     * @private
     */
    toggleExtensionControlledBox_: function(
        parentDiv, bubbleId, extensionId, extensionName) {
      var bubble = $(bubbleId);
      assert(bubble);
      bubble.hidden = extensionId.length == 0;
      if (bubble.hidden)
        return;

      // Set the extension image.
      var div = bubble.firstElementChild;
      div.style.backgroundImage =
          'url(http://chromesettings.github.io/extension-icon/' + extensionId + '/24/1)';

      // Set the bubble label.
      var label = loadTimeData.getStringF('extensionControlled', extensionName);
      var docFrag = parseHtmlSubset('<div>' + label + '</div>', ['B', 'DIV']);
      div.innerHTML = docFrag.firstChild.innerHTML;

      // Wire up the button to disable the right extension.
      var button = div.nextElementSibling;
      button.dataset.extensionId = extensionId;
    },

    /**
     * Toggles the warning boxes that show which extension is controlling
     * various settings of Chrome.
     * @param {{searchEngine: options.ExtensionData,
     *          homePage: options.ExtensionData,
     *          startUpPage: options.ExtensionData,
     *          newTabPage: options.ExtensionData,
     *          proxy: options.ExtensionData}} details A dictionary of ID+name
     *     pairs for each of the settings controlled by an extension.
     * @private
     */
    toggleExtensionIndicators_: function(details) {
      this.toggleExtensionControlledBox_('search-section-content',
                                         'search-engine-controlled',
                                         details.searchEngine.id,
                                         details.searchEngine.name);
      this.toggleExtensionControlledBox_('extension-controlled-container',
                                         'homepage-controlled',
                                         details.homePage.id,
                                         details.homePage.name);
      this.toggleExtensionControlledBox_('startup-section-content',
                                         'startpage-controlled',
                                         details.startUpPage.id,
                                         details.startUpPage.name);
      this.toggleExtensionControlledBox_('newtab-section-content',
                                         'newtab-controlled',
                                         details.newTabPage.id,
                                         details.newTabPage.name);
      this.toggleExtensionControlledBox_('proxy-section-content',
                                         'proxy-controlled',
                                         details.proxy.id,
                                         details.proxy.name);

      // The proxy section contains just the warning box and nothing else, so
      // if we're hiding the proxy warning box, we should also hide its header
      // section.
      $('proxy-section').hidden = details.proxy.id.length == 0;
    },


    /**
     * Show/hide touchpad-related settings.
     * @private
     */
    showTouchpadControls_: function(show) {
      $('touchpad-settings').hidden = !show;
      $('accessibility-tap-dragging').hidden = !show;
    },

    /**
     * Sets the state of the checkbox indicating if Bluetooth is turned on. The
     * state of the "Find devices" button and the list of discovered devices may
     * also be affected by a change to the state.
     * @param {boolean} checked Flag Indicating if Bluetooth is turned on.
     * @private
     */
    setBluetoothState_: function(checked) {
      $('enable-bluetooth').checked = checked;
      $('bluetooth-paired-devices-list').parentNode.hidden = !checked;
      $('bluetooth-add-device').hidden = !checked;
      $('bluetooth-reconnect-device').hidden = !checked;
    },

    /**
     * Process a bluetooth.onAdapterStateChanged event.
     * @param {!chrome.bluetooth.AdapterState} state
     * @private
     */
    onBluetoothAdapterStateChanged_: function(state) {
      if (!state || !state.available) {
        this.bluetoothAdapterState_ = null;
        $('bluetooth-devices').hidden = true;
        return;
      }
      $('bluetooth-devices').hidden = false;
      this.bluetoothAdapterState_ = state;
      this.setBluetoothState_(state.powered);

      // Flush the device lists.
      $('bluetooth-paired-devices-list').clear();
      $('bluetooth-unpaired-devices-list').clear();
      if (state.powered) {
        options.BluetoothOptions.updateDiscoveryState(state.discovering);
        // Update the device lists.
        chrome.bluetooth.getDevices(function(devices) {
          for (var device of devices)
            this.updateBluetoothDevicesList_(device);
        }.bind(this));
      } else {
        options.BluetoothOptions.dismissOverlay();
      }
    },

    /**
     * Process a bluetooth.onDeviceAdded or onDeviceChanged event and update the
     * device list.
     * @param {!chrome.bluetooth.Device} device
     * @private
     */
    onBluetoothDeviceAddedOrChanged_: function(device) {
      this.updateBluetoothDevicesList_(device);
    },

    /**
     * Process a bluetooth.onDeviceRemoved event and update the device list.
     * @param {!chrome.bluetooth.Device} device
     * @private
     */
    onBluetoothDeviceRemoved_: function(device) {
      this.removeBluetoothDevice_(device.address);
    },

    /**
     * Process a bluetoothPrivate onPairing event and update the device list.
     * @param {!chrome.bluetoothPrivate.PairingEvent} pairing_event
     * @private
     */
    onBluetoothPrivatePairing_: function(pairing_event) {
      this.updateBluetoothDevicesList_(pairing_event.device);
      BluetoothPairing.onBluetoothPairingEvent(pairing_event);
    },

    /**
     * Add |device| to the appropriate list of Bluetooth devices.
     * @param {!chrome.bluetooth.Device} device
     * @private
     */
    addBluetoothDeviceToList_: function(device) {
      // Display the "connecting" (already paired or not yet paired) and the
      // paired devices in the same list.
      if (device.paired || device.connecting)
        $('bluetooth-paired-devices-list').appendDevice(device);
      else
        $('bluetooth-unpaired-devices-list').appendDevice(device);
    },

    /**
     * Add |device| to the appropriate list of Bluetooth devices or update the
     * entry if a device with a matching |address| property exists.
     * @param {!chrome.bluetooth.Device} device
     * @private
     */
    updateBluetoothDevicesList_: function(device) {
      // Display the "connecting" (already paired or not yet paired) and the
      // paired devices in the same list.
      if (device.paired || device.connecting) {
        // Test to see if the device is currently in the unpaired list, in which
        // case it should be removed from that list.
        var index = $('bluetooth-unpaired-devices-list').find(device.address);
        if (index != undefined)
          $('bluetooth-unpaired-devices-list').deleteItemAtIndex(index);
      } else {
        // Test to see if the device is currently in the paired list, in which
        // case it should be removed from that list.
        var index = $('bluetooth-paired-devices-list').find(device.address);
        if (index != undefined)
          $('bluetooth-paired-devices-list').deleteItemAtIndex(index);
      }
      this.addBluetoothDeviceToList_(device);
    },

    /**
     * Removes an element from the list of available devices.
     * @param {string} address Unique address of the device.
     * @private
     */
    removeBluetoothDevice_: function(address) {
      var index = $('bluetooth-unpaired-devices-list').find(address);
      if (index != undefined) {
        $('bluetooth-unpaired-devices-list').deleteItemAtIndex(index);
      } else {
        index = $('bluetooth-paired-devices-list').find(address);
        if (index != undefined)
          $('bluetooth-paired-devices-list').deleteItemAtIndex(index);
      }
    },

    /**
     * Shows the overlay dialog for changing the user avatar image.
     * @private
     */
    showImagerPickerOverlay_: function() {
      PageManager.showPageByName('changePicture');
    },

    /**
     * Shows (or not) the "User" section of the settings page based on whether
     * any of the sub-sections are present (or not).
     * @private
     */
    maybeShowUserSection_: function() {
      $('sync-users-section').hidden =
          $('profiles-section').hidden &&
          $('sync-section').hidden &&
          $('profiles-supervised-dashboard-tip').hidden;
    },

    /**
     * Updates the date and time section with time sync information.
     * @param {boolean} canSetTime Whether the system time can be set.
     * @private
     */
    setCanSetTime_: function(canSetTime) {
      // If the time has been network-synced, it cannot be set manually.
      $('set-time').hidden = !canSetTime;
    },

    /**
     * Handle the 'set date and time' button click.
     * @private
     */
    handleSetTime_: function() {
      chrome.send('showSetTime');
    },

    /**
     * Enables the given element if possible; on Chrome OS, it won't enable
     * an element that must stay disabled for the session type.
     * @param {!Element} element Element to enable.
     */
    enableElementIfPossible_: function(element) {
      if (cr.isChromeOS)
        UIAccountTweaks.enableElementIfPossible(element);
      else
        element.disabled = false;
    },
  };

  // Forward public APIs to private implementations.
  cr.makePublic(BrowserOptions, [
    'deleteCurrentProfile',
    'enableCertificateButton',
    'enableDisplaySettings',
    'enableFactoryResetSection',
    'getCurrentProfile',
    'getStartStopSyncButton',
    'notifyInitializationComplete',
    'removeBluetoothDevice',
    'scrollToSection',
    'setAccountPictureManaged',
    'setWallpaperManaged',
    'setAutoOpenFileTypesDisplayed',
    'setCanSetTime',
    'setFontSize',
    'setHotwordRetrainLinkVisible',
    'setNativeThemeButtonEnabled',
    'setNetworkPredictionValue',
    'setNowSectionVisible',
    'setHighContrastCheckboxState',
    'setAllHotwordSectionsVisible',
    'setMetricsReportingCheckboxState',
    'setMetricsReportingSettingVisibility',
    'setProfilesInfo',
    'setSpokenFeedbackCheckboxState',
    'setSystemTimezoneManaged',
    'setThemesResetButtonEnabled',
    'setVirtualKeyboardCheckboxState',
    'setupPageZoomSelector',
    'setupProxySettingsButton',
    'setAudioHistorySectionVisible',
    'showCreateProfileError',
    'showCreateProfileSuccess',
    'showCreateProfileWarning',
    'showHotwordAlwaysOnSection',
    'showHotwordNoDspSection',
    'showHotwordSection',
    'showMouseControls',
    'showSupervisedUserImportError',
    'showSupervisedUserImportSuccess',
    'showTouchpadControls',
    'toggleExtensionIndicators',
    'updateAccountPicture',
    'updateDefaultBrowserState',
    'updateEasyUnlock',
    'updateManagesSupervisedUsers',
    'updateSearchEngines',
    'updateSyncState',
  ]);

  if (cr.isChromeOS) {
    /**
     * Returns username (canonical email) of the user logged in (ChromeOS only).
     * @return {string} user email.
     */
    // TODO(jhawkins): Investigate the use case for this method.
    BrowserOptions.getLoggedInUsername = function() {
      return BrowserOptions.getInstance().username_;
    };

    /**
     * Shows different button text for each consumer management enrollment
     * status.
     * @enum {string} status Consumer management service status string.
     */
    BrowserOptions.setConsumerManagementStatus = function(status) {
      var button = $('consumer-management-button');
      if (status == 'StatusUnknown') {
        button.hidden = true;
        return;
      }

      button.hidden = false;
      /** @type {string} */ var strId;
      switch (status) {
        case ConsumerManagementOverlay.Status.STATUS_UNENROLLED:
          strId = 'consumerManagementEnrollButton';
          button.disabled = false;
          ConsumerManagementOverlay.setStatus(status);
          break;
        case ConsumerManagementOverlay.Status.STATUS_ENROLLING:
          strId = 'consumerManagementEnrollingButton';
          button.disabled = true;
          break;
        case ConsumerManagementOverlay.Status.STATUS_ENROLLED:
          strId = 'consumerManagementUnenrollButton';
          button.disabled = false;
          ConsumerManagementOverlay.setStatus(status);
          break;
        case ConsumerManagementOverlay.Status.STATUS_UNENROLLING:
          strId = 'consumerManagementUnenrollingButton';
          button.disabled = true;
          break;
      }
      button.textContent = loadTimeData.getString(strId);
    };
  }

  // Export
  return {
    BrowserOptions: BrowserOptions
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options.browser_options', function() {
  /** @const */ var DeletableItem = options.DeletableItem;
  /** @const */ var DeletableItemList = options.DeletableItemList;
  /** @const */ var ListSingleSelectionModel = cr.ui.ListSingleSelectionModel;

  /**
   * Creates a new profile list item.
   * @param {Object} profileInfo The profile this item represents.
   * @constructor
   * @extends {options.DeletableItem}
   */
  function ProfileListItem(profileInfo) {
    var el = cr.doc.createElement('div');
    el.profileInfo_ = profileInfo;
    ProfileListItem.decorate(el);
    return el;
  }

  /**
   * Decorates an element as a profile list item.
   * @param {!HTMLElement} el The element to decorate.
   */
  ProfileListItem.decorate = function(el) {
    el.__proto__ = ProfileListItem.prototype;
    el.decorate();
  };

  ProfileListItem.prototype = {
    __proto__: DeletableItem.prototype,

    /**
     * @type {string} the file path of this profile list item.
     */
    get profilePath() {
      return this.profileInfo_.filePath;
    },

    /** @override */
    decorate: function() {
      DeletableItem.prototype.decorate.call(this);

      var profileInfo = this.profileInfo_;

      var containerEl = this.ownerDocument.createElement('div');
      containerEl.className = 'profile-container';

      var iconEl = this.ownerDocument.createElement('img');
      iconEl.className = 'profile-img';
      iconEl.style.content = getProfileAvatarIcon(profileInfo.iconURL);
      iconEl.alt = '';
      containerEl.appendChild(iconEl);

      var nameEl = this.ownerDocument.createElement('div');
      nameEl.className = 'profile-name';
      if (profileInfo.isCurrentProfile)
        nameEl.classList.add('profile-item-current');
      containerEl.appendChild(nameEl);

      var displayName = profileInfo.name;
      if (profileInfo.isCurrentProfile) {
        displayName = loadTimeData.getStringF('profilesListItemCurrent',
                                              profileInfo.name);
      }
      nameEl.textContent = displayName;

      if (profileInfo.isSupervised) {
        var supervisedEl = this.ownerDocument.createElement('div');
        supervisedEl.className = 'profile-supervised';
        supervisedEl.textContent = profileInfo.isChild ?
            loadTimeData.getString('childLabel') :
            loadTimeData.getString('supervisedUserLabel');
        containerEl.appendChild(supervisedEl);
      }

      this.contentElement.appendChild(containerEl);

      // Ensure that the button cannot be tabbed to for accessibility reasons.
      this.closeButtonElement.tabIndex = -1;
    },
  };

  var ProfileList = cr.ui.define('list');

  ProfileList.prototype = {
    __proto__: DeletableItemList.prototype,

    /** @override */
    decorate: function() {
      DeletableItemList.prototype.decorate.call(this);
      this.selectionModel = new ListSingleSelectionModel();
    },

    /** @override */
    createItem: function(pageInfo) {
      var item = new ProfileListItem(pageInfo);
      item.deletable = this.canDeleteItems_;
      return item;
    },

    /** @override */
    deleteItemAtIndex: function(index) {
      ManageProfileOverlay.showDeleteDialog(this.dataModel.item(index));
    },

    /** @override */
    activateItemAtIndex: function(index) {
      // Don't allow the user to edit a profile that is not current.
      var profileInfo = this.dataModel.item(index);
      if (profileInfo.isCurrentProfile)
        ManageProfileOverlay.showManageDialog(profileInfo);
    },

    /**
     * Sets whether items in this list are deletable.
     */
    set canDeleteItems(value) {
      this.canDeleteItems_ = value;
    },

    /**
     * @type {boolean} whether the items in this list are deletable.
     */
    get canDeleteItems() {
      return this.canDeleteItems_;
    },

    /**
     * If false, items in this list will not be deletable.
     * @private
     */
    canDeleteItems_: true,
  };

  return {
    ProfileList: ProfileList
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options.browser_options', function() {
  /** @const */ var AutocompleteList = cr.ui.AutocompleteList;
  /** @const */ var InlineEditableItem = options.InlineEditableItem;
  /** @const */ var InlineEditableItemList = options.InlineEditableItemList;

  /**
   * Creates a new startup page list item.
   * @param {Object} pageInfo The page this item represents.
   * @constructor
   * @extends {options.InlineEditableItem}
   */
  function StartupPageListItem(pageInfo) {
    var el = cr.doc.createElement('div');
    el.pageInfo_ = pageInfo;
    StartupPageListItem.decorate(el);
    return el;
  }

  /**
   * Decorates an element as a startup page list item.
   * @param {!HTMLElement} el The element to decorate.
   */
  StartupPageListItem.decorate = function(el) {
    el.__proto__ = StartupPageListItem.prototype;
    el.decorate();
  };

  StartupPageListItem.prototype = {
    __proto__: InlineEditableItem.prototype,

    /**
     * Input field for editing the page url.
     * @type {HTMLElement}
     * @private
     */
    urlField_: null,

    /** @override */
    decorate: function() {
      InlineEditableItem.prototype.decorate.call(this);

      var pageInfo = this.pageInfo_;

      if (pageInfo.modelIndex == -1) {
        this.isPlaceholder = true;
        pageInfo.title = loadTimeData.getString('startupAddLabel');
        pageInfo.url = '';
      }

      var titleEl = this.ownerDocument.createElement('div');
      titleEl.className = 'title';
      titleEl.classList.add('favicon-cell');
      titleEl.classList.add('weakrtl');
      titleEl.textContent = pageInfo.title;
      if (!this.isPlaceholder) {
        titleEl.style.backgroundImage = getFaviconImageSet(pageInfo.url);
        titleEl.title = pageInfo.tooltip;
      }

      this.contentElement.appendChild(titleEl);

      var urlEl = this.createEditableTextCell(pageInfo.url);
      urlEl.className = 'url';
      urlEl.classList.add('weakrtl');
      this.contentElement.appendChild(urlEl);

      var urlField = /** @type {HTMLElement} */(urlEl.querySelector('input'));
      urlField.className = 'weakrtl';
      urlField.placeholder = loadTimeData.getString('startupPagesPlaceholder');
      this.urlField_ = urlField;

      this.addEventListener('commitedit', this.onEditCommitted_);

      var self = this;
      urlField.addEventListener('focus', function(event) {
        self.parentNode.autocompleteList.attachToInput(urlField);
      });
      urlField.addEventListener('blur', function(event) {
        self.parentNode.autocompleteList.detach();
      });

      if (!this.isPlaceholder)
        titleEl.draggable = true;
    },

    /** @override */
    get currentInputIsValid() {
      return this.urlField_.validity.valid;
    },

    /** @override */
    get hasBeenEdited() {
      return this.urlField_.value != this.pageInfo_.url;
    },

    /**
     * Called when committing an edit; updates the model.
     * @param {Event} e The end event.
     * @private
     */
    onEditCommitted_: function(e) {
      var url = this.urlField_.value;
      if (this.isPlaceholder)
        chrome.send('addStartupPage', [url]);
      else
        chrome.send('editStartupPage', [this.pageInfo_.modelIndex, url]);
    },
  };

  var StartupPageList = cr.ui.define('list');

  StartupPageList.prototype = {
    __proto__: InlineEditableItemList.prototype,

    /**
     * An autocomplete suggestion list for URL editing.
     * @type {AutocompleteList}
     */
    autocompleteList: null,

    /**
     * The drop position information: "below" or "above".
     */
    dropPos: null,

    /** @override */
    decorate: function() {
      InlineEditableItemList.prototype.decorate.call(this);

      // Listen to drag and drop events.
      this.addEventListener('dragstart', this.handleDragStart_.bind(this));
      this.addEventListener('dragenter', this.handleDragEnter_.bind(this));
      this.addEventListener('dragover', this.handleDragOver_.bind(this));
      this.addEventListener('drop', this.handleDrop_.bind(this));
      this.addEventListener('dragleave', this.handleDragLeave_.bind(this));
      this.addEventListener('dragend', this.handleDragEnd_.bind(this));
    },

    /** @override */
    createItem: function(pageInfo) {
      var item = new StartupPageListItem(pageInfo);
      item.urlField_.disabled = this.disabled;
      return item;
    },

    /** @override */
    deleteItemAtIndex: function(index) {
      chrome.send('removeStartupPages', [index]);
    },

    /**
     * Computes the target item of drop event.
     * @param {Event} e The drop or dragover event.
     * @private
     */
    getTargetFromDropEvent_: function(e) {
      var target = e.target;
      // e.target may be an inner element of the list item
      while (target != null && !(target instanceof StartupPageListItem)) {
        target = target.parentNode;
      }
      return target;
    },

    /**
     * Handles the dragstart event.
     * @param {Event} e The dragstart event.
     * @private
     */
    handleDragStart_: function(e) {
      // Prevent dragging if the list is disabled.
      if (this.disabled) {
        e.preventDefault();
        return false;
      }

      var target = this.getTargetFromDropEvent_(e);
      // StartupPageListItem should be the only draggable element type in the
      // page but let's make sure.
      if (target instanceof StartupPageListItem) {
        this.draggedItem = target;
        this.draggedItem.editable = false;
        e.dataTransfer.effectAllowed = 'move';
        // We need to put some kind of data in the drag or it will be
        // ignored.  Use the URL in case the user drags to a text field or the
        // desktop.
        e.dataTransfer.setData('text/plain', target.urlField_.value);
      }
    },

    /**
     * Handles the dragenter event.
     * @param {Event} e The dragenter event.
     * @private
     */
    handleDragEnter_: function(e) {
      e.preventDefault();
    },

    /**
     * Handles the dragover event.
     * @param {Event} e The dragover event.
     * @private
     */
    handleDragOver_: function(e) {
      var dropTarget = this.getTargetFromDropEvent_(e);
      // Determines whether the drop target is to accept the drop.
      // The drop is only successful on another StartupPageListItem.
      if (!(dropTarget instanceof StartupPageListItem) ||
          dropTarget == this.draggedItem || dropTarget.isPlaceholder) {
        this.hideDropMarker_();
        return;
      }
      // Compute the drop postion. Should we move the dragged item to
      // below or above the drop target?
      var rect = dropTarget.getBoundingClientRect();
      var dy = e.clientY - rect.top;
      var yRatio = dy / rect.height;
      var dropPos = yRatio <= .5 ? 'above' : 'below';
      this.dropPos = dropPos;
      this.showDropMarker_(dropTarget, dropPos);
      e.preventDefault();
    },

    /**
     * Handles the drop event.
     * @param {Event} e The drop event.
     * @private
     */
    handleDrop_: function(e) {
      var dropTarget = this.getTargetFromDropEvent_(e);

      if (!(dropTarget instanceof StartupPageListItem) ||
          dropTarget.pageInfo_.modelIndex == -1) {
        return;
      }

      this.hideDropMarker_();

      // Insert the selection at the new position.
      var newIndex = this.dataModel.indexOf(dropTarget.pageInfo_);
      if (this.dropPos == 'below')
        newIndex += 1;

      // If there are selected indexes, it was a re-order.
      if (this.selectionModel.selectedIndexes.length > 0) {
        chrome.send('dragDropStartupPage',
                    [newIndex, this.selectionModel.selectedIndexes]);
        return;
      }

      // Otherwise it was potentially a drop of new data (e.g. a bookmark).
      var url = e.dataTransfer.getData('url');
      if (url) {
        e.preventDefault();
        chrome.send('addStartupPage', [url, newIndex]);
      }
    },

    /**
     * Handles the dragleave event.
     * @param {Event} e The dragleave event.
     * @private
     */
    handleDragLeave_: function(e) {
      this.hideDropMarker_();
    },

    /**
     * Handles the dragend event.
     * @param {Event} e The dragend event.
     * @private
     */
    handleDragEnd_: function(e) {
      this.draggedItem.editable = true;
      this.draggedItem.updateEditState();
    },

    /**
     * Shows and positions the marker to indicate the drop target.
     * @param {HTMLElement} target The current target list item of drop.
     * @param {string} pos 'below' or 'above'.
     * @private
     */
    showDropMarker_: function(target, pos) {
      window.clearTimeout(this.hideDropMarkerTimer_);
      var marker = $('startupPagesListDropmarker');
      var rect = target.getBoundingClientRect();
      var markerHeight = 6;
      if (pos == 'above') {
        marker.style.top = (rect.top - markerHeight / 2) + 'px';
      } else {
        marker.style.top = (rect.bottom - markerHeight / 2) + 'px';
      }
      marker.style.width = rect.width + 'px';
      marker.style.left = rect.left + 'px';
      marker.style.display = 'block';
    },

    /**
     * Hides the drop marker.
     * @private
     */
    hideDropMarker_: function() {
      // Hide the marker in a timeout to reduce flickering as we move between
      // valid drop targets.
      window.clearTimeout(this.hideDropMarkerTimer_);
      this.hideDropMarkerTimer_ = window.setTimeout(function() {
        $('startupPagesListDropmarker').style.display = '';
      }, 100);
    },
  };

  return {
    StartupPageList: StartupPageList
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  var Page = cr.ui.pageManager.Page;
  var PageManager = cr.ui.pageManager.PageManager;

  /**
   * ClearBrowserDataOverlay class
   * Encapsulated handling of the 'Clear Browser Data' overlay page.
   * @class
   */
  function ClearBrowserDataOverlay() {
    Page.call(this, 'clearBrowserData',
                     loadTimeData.getString('clearBrowserDataOverlayTabTitle'),
                     'clear-browser-data-overlay');
  }

  cr.addSingletonGetter(ClearBrowserDataOverlay);

  ClearBrowserDataOverlay.prototype = {
    // Inherit ClearBrowserDataOverlay from Page.
    __proto__: Page.prototype,

    /**
     * Whether deleting history and downloads is allowed.
     * @type {boolean}
     * @private
     */
    allowDeletingHistory_: true,

    /**
     * Whether or not clearing browsing data is currently in progress.
     * @type {boolean}
     * @private
     */
    isClearingInProgress_: false,

    /**
     * Whether or not the WebUI handler has completed initialization.
     *
     * Unless this becomes true, it must be assumed that the above flags might
     * not contain the authoritative values.
     *
     * @type {boolean}
     * @private
     */
    isInitializationComplete_: false,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      var f = this.updateStateOfControls_.bind(this);
      var types = ['browser.clear_data.browsing_history',
                   'browser.clear_data.download_history',
                   'browser.clear_data.cache',
                   'browser.clear_data.cookies',
                   'browser.clear_data.passwords',
                   'browser.clear_data.form_data',
                   'browser.clear_data.hosted_apps_data',
                   'browser.clear_data.content_licenses'];
      types.forEach(function(type) {
          Preferences.getInstance().addEventListener(type, f);
      });

      var checkboxes = document.querySelectorAll(
          '#cbd-content-area input[type=checkbox]');
      for (var i = 0; i < checkboxes.length; i++) {
        checkboxes[i].onclick = f;
      }

      $('clear-browser-data-dismiss').onclick = function(event) {
        ClearBrowserDataOverlay.dismiss();
      };
      $('clear-browser-data-commit').onclick = function(event) {
        ClearBrowserDataOverlay.setClearing(true);
        chrome.send('performClearBrowserData');
      };

      // For managed profiles, hide the checkboxes controlling whether or not
      // browsing and download history should be cleared. Note that this is
      // different than just disabling them as a result of enterprise policies.
      if (!loadTimeData.getBoolean('showDeleteBrowsingHistoryCheckboxes')) {
        $('delete-browsing-history-container').hidden = true;
        $('delete-download-history-container').hidden = true;
      }

      this.updateStateOfControls_();
    },

    /** @override */
    didShowPage: function() {
      chrome.send('openedClearBrowserData');
    },

    /**
     * Create a footer that explains that some content is not cleared by the
     * clear browsing data dialog and warns that the deletion may be synced.
     * @param {boolean} simple Whether to use a simple support string.
     * @param {boolean} syncing Whether the user uses Sync.
     * @private
     */
    createFooter_: function(simple, syncing) {
      // The localized string is of the form "Saved [content settings] and
      // {search engines} will not be cleared and may reflect your browsing
      // habits.", or of the form "Some settings that may reflect browsing
      // habits |will not be cleared|." if the simplified support string
      // experiment is enabled. The following parses out the parts in brackets
      // and braces and converts them into buttons whereas the remainders are
      // represented as span elements.
      var footer =
          document.querySelector('#some-stuff-remains-footer p span');
      var footerFragments =
          loadTimeData.getString('clearBrowserDataSupportString')
                      .split(/([|#])/);

      if (simple) {
        footerFragments.unshift(
            loadTimeData.getString('clearBrowserDataSyncWarning') +
            ' '  // Padding between the sync warning and the rest of the footer.
        );
      }

      for (var i = 0; i < footerFragments.length;) {
        var linkId = '';
        if (i + 2 < footerFragments.length) {
          if (footerFragments[i] == '|' && footerFragments[i + 2] == '|') {
            linkId = 'open-content-settings-from-clear-browsing-data';
          } else if (footerFragments[i] == '#' &&
                     footerFragments[i + 2] == '#') {
            linkId = 'open-search-engines-from-clear-browsing-data';
          }
        }

        if (linkId) {
          var link = new ActionLink;
          link.id = linkId;
          link.textContent = footerFragments[i + 1];
          footer.appendChild(link);
          i += 3;
        } else {
          var span = document.createElement('span');
          span.textContent = footerFragments[i];
          if (simple && i == 0) {
            span.id = 'clear-browser-data-sync-warning';
            span.hidden = !syncing;
          }
          footer.appendChild(span);
          i += 1;
        }
      }

      if (!simple) {
        $('open-content-settings-from-clear-browsing-data').onclick =
            function(event) {
          PageManager.showPageByName('content');
        };
        $('open-search-engines-from-clear-browsing-data').onclick =
            function(event) {
          PageManager.showPageByName('searchEngines');
        };
      }

      $('clear-browser-data-old-learn-more-link').hidden = simple;
      $('clear-browser-data-footer-learn-more-link').hidden = !simple;
      $('flash-storage-settings').hidden = simple;
    },

    /**
     * Shows or hides the sync warning based on whether the user uses Sync.
     * @param {boolean} syncing Whether the user uses Sync.
     * @private
     */
    updateSyncWarning_: function(syncing) {
      $('clear-browser-data-sync-warning').hidden = !syncing;
    },

    /**
     * Sets whether or not we are in the process of clearing data.
     * @param {boolean} clearing Whether the browsing data is currently being
     *     cleared.
     * @private
     */
    setClearing_: function(clearing) {
      this.isClearingInProgress_ = clearing;
      this.updateStateOfControls_();
    },

    /**
     * Sets whether deleting history and downloads is disallowed by enterprise
     * policies. This is called on initialization and in response to a change in
     * the corresponding preference.
     * @param {boolean} allowed Whether to allow deleting history and downloads.
     * @private
     */
    setAllowDeletingHistory_: function(allowed) {
      this.allowDeletingHistory_ = allowed;
      this.updateStateOfControls_();
    },

    /**
     * Called by the WebUI handler to signal that it has finished calling all
     * initialization methods.
     * @private
     */
    markInitializationComplete_: function() {
      this.isInitializationComplete_ = true;
      this.updateStateOfControls_();
    },

    /**
     * Updates the enabled/disabled/hidden status of all controls on the dialog.
     * @private
     */
    updateStateOfControls_: function() {
      // The commit button is enabled if at least one data type selected to be
      // cleared, and if we are not already in the process of clearing.
      // To prevent the commit button from being hazardously enabled for a very
      // short time before setClearing() is called the first time by the native
      // side, also disable the button if |isInitializationComplete_| is false.
      var enabled = false;
      if (this.isInitializationComplete_ && !this.isClearingInProgress_) {
        var checkboxes = document.querySelectorAll(
            '#cbd-content-area input[type=checkbox]');
        for (var i = 0; i < checkboxes.length; i++) {
          if (checkboxes[i].checked) {
            enabled = true;
            break;
          }
        }
      }
      $('clear-browser-data-commit').disabled = !enabled;

      // The checkboxes for clearing history/downloads are enabled unless they
      // are disallowed by policies, or we are in the process of clearing data.
      // To prevent flickering, these, and the rest of the controls can safely
      // be enabled for a short time before the first call to setClearing().
      var enabled = this.allowDeletingHistory_ && !this.isClearingInProgress_;
      $('delete-browsing-history-checkbox').disabled = !enabled;
      $('delete-download-history-checkbox').disabled = !enabled;
      if (!this.allowDeletingHistory_) {
        $('delete-browsing-history-checkbox').checked = false;
        $('delete-download-history-checkbox').checked = false;
      }

      // Enable everything else unless we are in the process of clearing.
      var clearing = this.isClearingInProgress_;
      $('delete-cache-checkbox').disabled = clearing;
      $('delete-cookies-checkbox').disabled = clearing;
      $('delete-passwords-checkbox').disabled = clearing;
      $('delete-form-data-checkbox').disabled = clearing;
      $('delete-hosted-apps-data-checkbox').disabled = clearing;
      $('deauthorize-content-licenses-checkbox').disabled = clearing;
      $('clear-browser-data-time-period').disabled = clearing;
      $('cbd-throbber').style.visibility = clearing ? 'visible' : 'hidden';
      $('clear-browser-data-dismiss').disabled = clearing;
    },

    /**
     * Updates the given data volume counter with a given text.
     * @param {string} pref_name Name of the deletion preference of the counter
     *     to be updated.
     * @param {string} text The new text of the counter.
     * @private
     */
    updateCounter_: function(pref_name, text) {
      var counter = document.querySelector(
          'input[pref="' + pref_name + '"] ~ .clear-browser-data-counter');
      counter.textContent = text;
    }
  };

  //
  // Chrome callbacks
  //
  ClearBrowserDataOverlay.setAllowDeletingHistory = function(allowed) {
    ClearBrowserDataOverlay.getInstance().setAllowDeletingHistory_(allowed);
  };

  ClearBrowserDataOverlay.updateCounter = function(pref_name, text) {
    ClearBrowserDataOverlay.getInstance().updateCounter_(pref_name, text);
  };

  ClearBrowserDataOverlay.createFooter = function(simple, syncing) {
    ClearBrowserDataOverlay.getInstance().createFooter_(simple, syncing);
  };

  ClearBrowserDataOverlay.updateSyncWarning = function(syncing) {
    ClearBrowserDataOverlay.getInstance().updateSyncWarning_(syncing);
  };

  ClearBrowserDataOverlay.setClearing = function(clearing) {
    ClearBrowserDataOverlay.getInstance().setClearing_(clearing);
  };

  ClearBrowserDataOverlay.markInitializationComplete = function() {
    ClearBrowserDataOverlay.getInstance().markInitializationComplete_();
  };

  ClearBrowserDataOverlay.setBannerText = function(text) {
    $('clear-browser-data-info-banner').innerText = text;
  };

  ClearBrowserDataOverlay.doneClearing = function() {
    // The delay gives the user some feedback that the clearing
    // actually worked. Otherwise the dialog just vanishes instantly in most
    // cases.
    window.setTimeout(function() {
      ClearBrowserDataOverlay.setClearing(false);
      ClearBrowserDataOverlay.dismiss();
    }, 200);
  };

  ClearBrowserDataOverlay.dismiss = function() {
    var topmostVisiblePage = PageManager.getTopmostVisiblePage();
    if (topmostVisiblePage && topmostVisiblePage.name == 'clearBrowserData')
      PageManager.closeOverlay();
  };

  // Export
  return {
    ClearBrowserDataOverlay: ClearBrowserDataOverlay
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /** @const */ var SettingsDialog = options.SettingsDialog;

  /**
   * A dialog that will pop up when the user attempts to set the value of the
   * Boolean |pref| to |true|, asking for confirmation. If the user clicks OK,
   * the new value is committed to Chrome. If the user clicks Cancel or leaves
   * the settings page, the new value is discarded.
   * @constructor
   * @param {string} name See Page constructor.
   * @param {string} title See Page constructor.
   * @param {string} pageDivName See Page constructor.
   * @param {HTMLButtonElement} okButton The confirmation button element.
   * @param {HTMLButtonElement} cancelButton The cancellation button element.
   * @param {string} pref The pref that requires confirmation.
   * @param {string} metric User metrics identifier.
   * @param {string=} opt_confirmedPref A pref used to remember whether the
   *     user has confirmed the dialog before. This ensures that the user is
   *     presented with the dialog only once. If left |undefined|, the dialog
   *     will pop up every time the user attempts to set |pref| to |true|.
   * @extends {options.SettingsDialog}
   */
  function ConfirmDialog(name, title, pageDivName, okButton, cancelButton, pref,
                         metric, opt_confirmedPref) {
    SettingsDialog.call(this, name, title, pageDivName, okButton, cancelButton);

    /** @protected */
    this.pref = pref;

    /** @protected */
    this.metric = metric;

    /** @private */
    this.confirmedPref_ = opt_confirmedPref;

    /** @private */
    this.confirmed_ = false;
  }

  ConfirmDialog.prototype = {
    // Set up the prototype chain
    __proto__: SettingsDialog.prototype,

    /**
     * Handle changes to |pref|. Only uncommitted changes are relevant as these
     * originate from user and need to be explicitly committed to take effect.
     * Pop up the dialog or commit the change, depending on whether confirmation
     * is needed.
     * @param {Event} event Change event.
     * @private
     */
    onPrefChanged_: function(event) {
      if (!event.value.uncommitted)
        return;

      if (event.value.value && !this.confirmed_)
        PageManager.showPageByName(this.name, false);
      else
        Preferences.getInstance().commitPref(this.pref, this.metric);
    },

    /**
     * Handle changes to |confirmedPref_| by caching them.
     * @param {Event} event Change event.
     * @private
     */
    onConfirmedChanged_: function(event) {
      this.confirmed_ = event.value.value;
    },

    /** @override */
    initializePage: function() {
      SettingsDialog.prototype.initializePage.call(this);

      this.okButton.onclick = this.handleConfirm.bind(this);
      this.cancelButton.onclick = this.handleCancel.bind(this);
      Preferences.getInstance().addEventListener(
          this.pref, this.onPrefChanged_.bind(this));
      if (this.confirmedPref_) {
        Preferences.getInstance().addEventListener(
            this.confirmedPref_, this.onConfirmedChanged_.bind(this));
      }
    },

    /**
     * Handle the confirm button by committing the |pref| change. If
     * |confirmedPref_| has been specified, also remember that the dialog has
     * been confirmed to avoid bringing it up in the future.
     * @override
     */
    handleConfirm: function() {
      SettingsDialog.prototype.handleConfirm.call(this);

      Preferences.getInstance().commitPref(this.pref, this.metric);
      if (this.confirmedPref_)
        Preferences.setBooleanPref(this.confirmedPref_, true, true);
    },

    /**
     * Handle the cancel button by rolling back the |pref| change without it
     * ever taking effect.
     * @override
     */
    handleCancel: function() {
      SettingsDialog.prototype.handleCancel.call(this);
      Preferences.getInstance().rollbackPref(this.pref);
    },

    /**
     * When a user navigates away from a confirm dialog, treat as a cancel.
     * @protected
     * @override
     */
    willHidePage: function() {
      if (this.visible)
        Preferences.getInstance().rollbackPref(this.pref);
    },
  };

  return {
    ConfirmDialog: ConfirmDialog
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.exportPath('options');

/**
 * @typedef {{appId: string,
 *            appName: (string|undefined),
 *            embeddingOrigin: (string|undefined),
 *            origin: string,
 *            setting: string,
 *            source: string,
 *            video: (string|undefined)}}
 */
options.Exception;

cr.define('options', function() {
  /** @const */ var Page = cr.ui.pageManager.Page;
  /** @const */ var PageManager = cr.ui.pageManager.PageManager;

  // Lookup table to generate the i18n strings.
  /** @const */ var permissionsLookup = {
    'cookies': 'cookies',
    'images': 'images',
    'javascript': 'javascript',
    'keygen': 'keygen',
    'location': 'location',
    'media-stream-camera': 'mediaStreamCamera',
    'media-stream-mic': 'mediaStreamMic',
    'multiple-automatic-downloads': 'multipleAutomaticDownloads',
    'notifications': 'notifications',
    'plugins': 'plugins',
    'popups': 'popups',
  };

  //////////////////////////////////////////////////////////////////////////////
  // ContentSettings class:

  /**
   * Encapsulated handling of content settings page.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function ContentSettings() {
    this.activeNavTab = null;
    Page.call(this, 'content',
              loadTimeData.getString('contentSettingsPageTabTitle'),
              'content-settings-page');
  }

  cr.addSingletonGetter(ContentSettings);

  ContentSettings.prototype = {
    __proto__: Page.prototype,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      var exceptionsButtons =
          this.pageDiv.querySelectorAll('.exceptions-list-button');
      for (var i = 0; i < exceptionsButtons.length; i++) {
        exceptionsButtons[i].onclick = function(event) {
          var hash = event.currentTarget.getAttribute('contentType');
          PageManager.showPageByName('contentExceptions', true,
                                     {hash: '#' + hash});
        };
      }

      var manageHandlersButton = $('manage-handlers-button');
      if (manageHandlersButton) {
        manageHandlersButton.onclick = function(event) {
          PageManager.showPageByName('handlers');
        };
      }

      if (cr.isChromeOS) {
        // Disable some controls for Guest in Chrome OS.
        UIAccountTweaks.applyGuestSessionVisibility(document);

        // Disable some controls for Public session in Chrome OS.
        UIAccountTweaks.applyPublicSessionVisibility(document);
      }

      // Cookies filter page ---------------------------------------------------
      $('show-cookies-button').onclick = function(event) {
        chrome.send('coreOptionsUserMetricsAction', ['Options_ShowCookies']);
        PageManager.showPageByName('cookies');
      };

      $('content-settings-overlay-confirm').onclick =
          PageManager.closeOverlay.bind(PageManager);

      $('media-pepper-flash-default-mic').hidden = true;
      $('media-pepper-flash-default-camera').hidden = true;
      $('media-pepper-flash-exceptions-mic').hidden = true;
      $('media-pepper-flash-exceptions-camera').hidden = true;

      $('media-select-mic').addEventListener('change',
          ContentSettings.setDefaultMicrophone_);
      $('media-select-camera').addEventListener('change',
          ContentSettings.setDefaultCamera_);
    },
  };

  ContentSettings.updateHandlersEnabledRadios = function(enabled) {
    var selector = '#content-settings-page input[type=radio][value=' +
        (enabled ? 'allow' : 'block') + '].handler-radio';
    document.querySelector(selector).checked = true;
  };

  /**
   * Sets the values for all the content settings radios and labels.
   * @param {Object<{managedBy: string, value: string}>} dict A mapping from
   *     radio groups to the checked value for that group.
   */
  ContentSettings.setContentFilterSettingsValue = function(dict) {
    for (var group in dict) {
      var settingLabel = $(group + '-default-string');
      if (settingLabel) {
        var value = dict[group].value;
        var valueId =
            permissionsLookup[group] + value[0].toUpperCase() + value.slice(1);
        settingLabel.textContent = loadTimeData.getString(valueId);
      }

      var managedBy = dict[group].managedBy;
      var controlledBy = managedBy == 'policy' || managedBy == 'extension' ?
          managedBy : null;
      document.querySelector('input[type=radio][name=' + group + '][value=' +
                             dict[group].value + ']').checked = true;
      var radios = document.querySelectorAll('input[type=radio][name=' +
                                             group + ']');
      for (var i = 0, len = radios.length; i < len; i++) {
        radios[i].disabled = (managedBy != 'default');
        radios[i].controlledBy = controlledBy;
      }
      var indicators = document.querySelectorAll(
          'span.controlled-setting-indicator[content-setting=' + group + ']');
      if (indicators.length == 0)
        continue;
      // Create a synthetic pref change event decorated as
      // CoreOptionsHandler::CreateValueForPref() does.
      var event = new Event(group);
      event.value = {
        value: dict[group].value,
        controlledBy: controlledBy,
      };
      for (var i = 0; i < indicators.length; i++) {
        indicators[i].handlePrefChange(event);
      }
    }
  };

  /**
   * Initializes an exceptions list.
   * @param {string} type The content type that we are setting exceptions for.
   * @param {Array<options.Exception>} exceptions An array of pairs, where the
   *     first element of each pair is the filter string, and the second is the
   *     setting (allow/block).
   */
  ContentSettings.setExceptions = function(type, exceptions) {
    this.getExceptionsList(type, 'normal').setExceptions(exceptions);
  };

  ContentSettings.setHandlers = function(handlers) {
    $('handlers-list').setHandlers(handlers);
  };

  ContentSettings.setIgnoredHandlers = function(ignoredHandlers) {
    $('ignored-handlers-list').setHandlers(ignoredHandlers);
  };

  ContentSettings.setOTRExceptions = function(type, otrExceptions) {
    var exceptionsList = this.getExceptionsList(type, 'otr');
    // Settings for Guest hides many sections, so check for null first.
    if (exceptionsList) {
      exceptionsList.parentNode.hidden = false;
      exceptionsList.setExceptions(otrExceptions);
    }
  };

  /**
   * @param {string} type The type of exceptions (e.g. "location") to get.
   * @param {string} mode The mode of the desired exceptions list (e.g. otr).
   * @return {?options.contentSettings.ExceptionsList} The corresponding
   *     exceptions list or null.
   */
  ContentSettings.getExceptionsList = function(type, mode) {
    var exceptionsList = document.querySelector(
        'div[contentType=' + type + '] list[mode=' + mode + ']');
    return !exceptionsList ? null :
        assertInstanceof(exceptionsList,
                         options.contentSettings.ExceptionsList);
  };

  /**
   * The browser's response to a request to check the validity of a given URL
   * pattern.
   * @param {string} type The content type.
   * @param {string} mode The browser mode.
   * @param {string} pattern The pattern.
   * @param {boolean} valid Whether said pattern is valid in the context of
   *     a content exception setting.
   */
  ContentSettings.patternValidityCheckComplete =
      function(type, mode, pattern, valid) {
    this.getExceptionsList(type, mode).patternValidityCheckComplete(pattern,
                                                                    valid);
  };

  /**
   * Shows/hides the link to the Pepper Flash camera or microphone,
   * default or exceptions settings.
   * Please note that whether the link is actually showed or not is also
   * affected by the style class pepper-flash-settings.
   * @param {string} linkType Can be 'default' or 'exceptions'.
   * @param {string} contentType Can be 'mic' or 'camera'.
   * @param {boolean} show Whether to show (or hide) the link.
   */
  ContentSettings.showMediaPepperFlashLink =
      function(linkType, contentType, show) {
    assert(['default', 'exceptions'].indexOf(linkType) >= 0);
    assert(['mic', 'camera'].indexOf(contentType) >= 0);
    $('media-pepper-flash-' + linkType + '-' + contentType).hidden = !show;
  };

  /**
   * Shows/hides parts of the fullscreen and mouselock sections.
   * @param {boolean} globalsVisible Whether to show (or hide) global settings.
   */
  ContentSettings.setExclusiveAccessVisible = function(globalsVisible) {
    $('mouselock-global-settings').hidden = !globalsVisible;
  };

  /**
   * Updates the microphone/camera devices menu with the given entries.
   * @param {string} type The device type.
   * @param {Array} devices List of available devices.
   * @param {string} defaultdevice The unique id of the current default device.
   */
  ContentSettings.updateDevicesMenu = function(type, devices, defaultdevice) {
    var deviceSelect = '';
    if (type == 'mic') {
      deviceSelect = $('media-select-mic');
    } else if (type == 'camera') {
      deviceSelect = $('media-select-camera');
    } else {
      console.error('Unknown device type for <device select> UI element: ' +
                    type);
      return;
    }

    deviceSelect.textContent = '';

    var deviceCount = devices.length;
    var defaultIndex = -1;
    for (var i = 0; i < deviceCount; i++) {
      var device = devices[i];
      var option = new Option(device.name, device.id);
      if (option.value == defaultdevice)
        defaultIndex = i;
      deviceSelect.appendChild(option);
    }
    if (defaultIndex >= 0)
      deviceSelect.selectedIndex = defaultIndex;
  };

  /**
   * Sets the visibility of the microphone/camera devices menu.
   * @param {string} type The content settings type name of this device.
   * @param {boolean} show Whether to show the menu.
   */
  ContentSettings.setDevicesMenuVisibility = function(type, show) {
    assert(type == 'media-stream-mic' || type == 'media-stream-camera');
    var deviceSelect = $(type == 'media-stream-mic' ? 'media-select-mic' :
                                                      'media-select-camera');
    deviceSelect.hidden = !show;
  };

  /**
   * Enables/disables the protected content exceptions button.
   * @param {boolean} enable Whether to enable the button.
   */
  ContentSettings.enableProtectedContentExceptions = function(enable) {
    var exceptionsButton = $('protected-content-exceptions');
    if (exceptionsButton)
      exceptionsButton.disabled = !enable;
  };

  /**
   * Set the default microphone device based on the popup selection.
   * @private
   */
  ContentSettings.setDefaultMicrophone_ = function() {
    var deviceSelect = $('media-select-mic');
    chrome.send('setDefaultCaptureDevice', ['mic', deviceSelect.value]);
  };

  /**
   * Set the default camera device based on the popup selection.
   * @private
   */
  ContentSettings.setDefaultCamera_ = function() {
    var deviceSelect = $('media-select-camera');
    chrome.send('setDefaultCaptureDevice', ['camera', deviceSelect.value]);
  };

  // Export
  return {
    ContentSettings: ContentSettings
  };

});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options.contentSettings', function() {
  /** @const */ var ControlledSettingIndicator =
                    options.ControlledSettingIndicator;
  /** @const */ var InlineEditableItemList = options.InlineEditableItemList;
  /** @const */ var InlineEditableItem = options.InlineEditableItem;
  /** @const */ var ArrayDataModel = cr.ui.ArrayDataModel;

  /**
   * Returns whether exceptions list for the type is editable.
   *
   * @param {string} contentType The type of the list.
   */
  function isEditableType(contentType) {
    // Exceptions of the following lists are not editable for now.
    return !(contentType == 'location' ||
             contentType == 'fullscreen' ||
             contentType == 'media-stream-mic' ||
             contentType == 'media-stream-camera' ||
             contentType == 'midi-sysex' ||
             contentType == 'zoomlevels' ||
             isChosenObjectType(contentType));
  }

  /**
   * Returns whether exceptions of this type represent chosen objects.
   *
   * @param {string} contentType The type of the list.
   */
  function isChosenObjectType(contentType) {
    return contentType == 'usb-devices';
  }

  /**
   * Returns the ID of the column containing values for the given content type.
   *
   * @param {string} contentType The type of the list.
   */
  function valueColumnForContentType(contentType) {
    if (contentType == 'usb-devices')
      return 'exception-usb-device-column';
    if (contentType == 'zoomlevels')
      return 'exception-zoom-column';
    return 'exception-behavior-column';
  }

  /**
   * Creates a new exceptions list item.
   *
   * @param {string} contentType The type of the list.
   * @param {string} mode The browser mode, 'otr' or 'normal'.
   * @param {Object} exception A dictionary that contains the data of the
   *     exception.
   * @constructor
   * @extends {options.InlineEditableItem}
   */
  function ExceptionsListItem(contentType, mode, exception) {
    var el = cr.doc.createElement('div');
    el.mode = mode;
    el.contentType = contentType;
    el.dataItem = exception;
    el.__proto__ = ExceptionsListItem.prototype;
    el.decorate();

    return el;
  }

  ExceptionsListItem.prototype = {
    __proto__: InlineEditableItem.prototype,

    /**
     * Called when an element is decorated as a list item.
     */
    decorate: function() {
      InlineEditableItem.prototype.decorate.call(this);

      this.isPlaceholder = !this.pattern;
      var patternCell = this.createEditableTextCell(this.pattern);
      patternCell.className = 'exception-pattern';
      patternCell.classList.add('weakrtl');
      this.contentElement.appendChild(patternCell);
      if (this.pattern)
        this.patternLabel = patternCell.querySelector('.static-text');
      var input = patternCell.querySelector('input');

      // Setting label for display mode. |pattern| will be null for the 'add new
      // exception' row.
      if (this.pattern) {
        var settingLabel = cr.doc.createElement('span');
        settingLabel.textContent = this.settingForDisplay();
        settingLabel.className = 'exception-setting';
        settingLabel.setAttribute('displaymode', 'static');
        this.contentElement.appendChild(settingLabel);
        this.settingLabel = settingLabel;
      }

      // Setting select element for edit mode.
      var select = cr.doc.createElement('select');
      var optionAllow = cr.doc.createElement('option');
      optionAllow.textContent = loadTimeData.getString('allowException');
      optionAllow.value = 'allow';
      select.appendChild(optionAllow);

      if (this.contentType == 'plugins') {
        var optionDetect = cr.doc.createElement('option');
        optionDetect.textContent = loadTimeData.getString('detectException');
        optionDetect.value = 'detect_important_content';
        select.appendChild(optionDetect);
      }

      if (this.contentType == 'cookies') {
        var optionSession = cr.doc.createElement('option');
        optionSession.textContent = loadTimeData.getString('sessionException');
        optionSession.value = 'session_only';
        select.appendChild(optionSession);
      }

      if (this.contentType != 'fullscreen') {
        var optionBlock = cr.doc.createElement('option');
        optionBlock.textContent = loadTimeData.getString('blockException');
        optionBlock.value = 'block';
        select.appendChild(optionBlock);
      }

      if (this.isEmbeddingRule()) {
        this.patternLabel.classList.add('sublabel');
        this.editable = false;
      }

      if (this.setting == 'default') {
        // Items that don't have their own settings (parents of 'embedded on'
        // items) aren't deletable.
        this.deletable = false;
        this.editable = false;
      }

      if (this.contentType != 'zoomlevels' &&
          !isChosenObjectType(this.contentType)) {
        this.addEditField(select, this.settingLabel);
        this.contentElement.appendChild(select);
      }
      select.className = 'exception-setting';
      select.setAttribute('aria-labelledby',
                          valueColumnForContentType(this.contentType));

      if (this.pattern)
        select.setAttribute('displaymode', 'edit');

      if (this.contentType == 'zoomlevels') {
        this.deletable = true;

        var zoomLabel = cr.doc.createElement('span');
        zoomLabel.textContent = this.dataItem.zoom;
        zoomLabel.className = 'exception-setting';
        zoomLabel.setAttribute('displaymode', 'static');
        this.contentElement.appendChild(zoomLabel);
        this.zoomLabel = zoomLabel;
      }

      if (isChosenObjectType(this.contentType) &&
          this.dataItem.object !== undefined) {
        this.deletable = true;

        var objectLabel = cr.doc.createElement('span');
        objectLabel.textContent = this.dataItem['objectName'];
        objectLabel.className = 'exception-setting';
        objectLabel.setAttribute('displaymode', 'static');
        this.contentElement.appendChild(objectLabel);
        this.objectLabel = objectLabel;
      }

      // Used to track whether the URL pattern in the input is valid.
      // This will be true if the browser process has informed us that the
      // current text in the input is valid. Changing the text resets this to
      // false, and getting a response from the browser sets it back to true.
      // It starts off as false for empty string (new exceptions) or true for
      // already-existing exceptions (which we assume are valid).
      this.inputValidityKnown = this.pattern;
      // This one tracks the actual validity of the pattern in the input. This
      // starts off as true so as not to annoy the user when he adds a new and
      // empty input.
      this.inputIsValid = true;

      this.input = input;
      this.select = select;

      this.updateEditables();
      this.editable = this.editable && isEditableType(this.contentType);

      // If the source of the content setting exception is not a user
      // preference, that source controls the exception and the user cannot edit
      // or delete it.
      var controlledBy =
          this.dataItem.source && this.dataItem.source != 'preference' ?
              this.dataItem.source : null;

      if (controlledBy) {
        this.setAttribute('controlled-by', controlledBy);
        this.deletable = false;
        this.editable = false;
      }

      if (controlledBy == 'policy' || controlledBy == 'extension') {
        this.querySelector('.row-delete-button').hidden = true;
        var indicator = new ControlledSettingIndicator();
        indicator.setAttribute('content-exception', this.contentType);
        // Create a synthetic pref change event decorated as
        // CoreOptionsHandler::CreateValueForPref() does.
        var event = new Event(this.contentType);
        event.value = { controlledBy: controlledBy };
        indicator.handlePrefChange(event);
        this.appendChild(indicator);
      }

      // If the exception comes from a hosted app, display the name and the
      // icon of the app.
      if (controlledBy == 'HostedApp') {
        this.title =
            loadTimeData.getString('setBy') + ' ' + this.dataItem.appName;
        var button = this.querySelector('.row-delete-button');
        // Use the host app's favicon (16px, match bigger size).
        // See c/b/ui/webui/extensions/extension_icon_source.h
        // for a description of the http://chromesettings.github.io/extension-icon URL.
        button.style.backgroundImage =
            'url(\'http://chromesettings.github.io/extension-icon/' + this.dataItem.appId + '/16/1\')';
      }

      var listItem = this;
      // Handle events on the editable nodes.
      input.oninput = function(event) {
        listItem.inputValidityKnown = false;
        chrome.send('checkExceptionPatternValidity',
                    [listItem.contentType, listItem.mode, input.value]);
      };

      // Listen for edit events.
      this.addEventListener('canceledit', this.onEditCancelled_);
      this.addEventListener('commitedit', this.onEditCommitted_);
    },

    isEmbeddingRule: function() {
      return this.dataItem.embeddingOrigin &&
          this.dataItem.embeddingOrigin !== this.dataItem.origin;
    },

    /**
     * The pattern (e.g., a URL) for the exception.
     *
     * @type {string}
     */
    get pattern() {
      if (!this.isEmbeddingRule())
        return this.dataItem.origin;

      return loadTimeData.getStringF('embeddedOnHost',
                                     this.dataItem.embeddingOrigin);
    },
    set pattern(pattern) {
      if (!this.editable)
        console.error('Tried to change uneditable pattern');

      this.dataItem.displayPattern = pattern;
    },

    /**
     * The setting (allow/block) for the exception.
     *
     * @type {string}
     */
    get setting() {
      return this.dataItem.setting;
    },
    set setting(setting) {
      this.dataItem.setting = setting;
    },

    /**
     * Gets a human-readable setting string.
     *
     * @return {string} The display string.
     */
    settingForDisplay: function() {
      return this.getDisplayStringForSetting(this.setting);
    },

    /**
     * Gets a human-readable display string for setting.
     *
     * @param {string} setting The setting to be displayed.
     * @return {string} The display string.
     */
    getDisplayStringForSetting: function(setting) {
      if (setting == 'allow')
        return loadTimeData.getString('allowException');
      else if (setting == 'block')
        return loadTimeData.getString('blockException');
      else if (setting == 'ask')
        return loadTimeData.getString('askException');
      else if (setting == 'session_only')
        return loadTimeData.getString('sessionException');
      else if (setting == 'detect_important_content')
        return loadTimeData.getString('detectException');
      else if (setting == 'default')
        return '';

      console.error('Unknown setting: [' + setting + ']');
      return '';
    },

    /**
     * Update this list item to reflect whether the input is a valid pattern.
     *
     * @param {boolean} valid Whether said pattern is valid in the context of a
     *     content exception setting.
     */
    setPatternValid: function(valid) {
      if (valid || !this.input.value)
        this.input.setCustomValidity('');
      else
        this.input.setCustomValidity(' ');
      this.inputIsValid = valid;
      this.inputValidityKnown = true;
    },

    /**
     * Set the <input> to its original contents. Used when the user quits
     * editing.
     */
    resetInput: function() {
      this.input.value = this.pattern;
    },

    /**
     * Copy the data model values to the editable nodes.
     */
    updateEditables: function() {
      this.resetInput();

      var settingOption =
          this.select.querySelector('[value=\'' + this.setting + '\']');
      if (settingOption)
        settingOption.selected = true;
    },

    /** @override */
    get currentInputIsValid() {
      return this.inputValidityKnown && this.inputIsValid;
    },

    /** @override */
    get hasBeenEdited() {
      var livePattern = this.input.value;
      var liveSetting = this.select.value;
      return livePattern != this.pattern || liveSetting != this.setting;
    },

    /**
     * Called when committing an edit.
     *
     * @param {Event} e The end event.
     * @private
     */
    onEditCommitted_: function(e) {
      var newPattern = this.input.value;
      var newSetting = this.select.value;

      this.finishEdit(newPattern, newSetting);
    },

    /**
     * Called when cancelling an edit; resets the control states.
     *
     * @param {Event} e The cancel event.
     * @private
     */
    onEditCancelled_: function(e) {
      this.updateEditables();
      this.setPatternValid(true);
    },

    /**
     * Editing is complete; update the model.
     *
     * @param {string} newPattern The pattern that the user entered.
     * @param {string} newSetting The setting the user chose.
     */
    finishEdit: function(newPattern, newSetting) {
      this.patternLabel.textContent = newPattern;
      this.settingLabel.textContent = this.settingForDisplay();
      var oldPattern = this.pattern;
      this.pattern = newPattern;
      this.setting = newSetting;

      // TODO(estade): this will need to be updated if geolocation/notifications
      // become editable.
      if (oldPattern != newPattern) {
        chrome.send('removeException',
                    [this.contentType, this.mode, oldPattern]);
      }

      chrome.send('setException',
                  [this.contentType, this.mode, newPattern, newSetting]);
    },
  };

  /**
   * Creates a new list item for the Add New Item row, which doesn't represent
   * an actual entry in the exceptions list but allows the user to add new
   * exceptions.
   *
   * @param {string} contentType The type of the list.
   * @param {string} mode The browser mode, 'otr' or 'normal'.
   * @constructor
   * @extends {options.contentSettings.ExceptionsListItem}
   */
  function ExceptionsAddRowListItem(contentType, mode) {
    var el = cr.doc.createElement('div');
    el.mode = mode;
    el.contentType = contentType;
    el.dataItem = [];
    el.__proto__ = ExceptionsAddRowListItem.prototype;
    el.decorate();

    return el;
  }

  ExceptionsAddRowListItem.prototype = {
    __proto__: ExceptionsListItem.prototype,

    decorate: function() {
      ExceptionsListItem.prototype.decorate.call(this);

      this.input.placeholder =
          loadTimeData.getString('addNewExceptionInstructions');

      // Do we always want a default of allow?
      this.setting = 'allow';
    },

    /**
     * Clear the <input> and let the placeholder text show again.
     */
    resetInput: function() {
      this.input.value = '';
    },

    /** @override */
    get hasBeenEdited() {
      return this.input.value != '';
    },

    /**
     * Editing is complete; update the model. As long as the pattern isn't
     * empty, we'll just add it.
     *
     * @param {string} newPattern The pattern that the user entered.
     * @param {string} newSetting The setting the user chose.
     */
    finishEdit: function(newPattern, newSetting) {
      this.resetInput();
      chrome.send('setException',
                  [this.contentType, this.mode, newPattern, newSetting]);
    },
  };

  /**
   * Creates a new exceptions list.
   *
   * @constructor
   * @extends {options.InlineEditableItemList}
   */
  var ExceptionsList = cr.ui.define('list');

  ExceptionsList.prototype = {
    __proto__: InlineEditableItemList.prototype,

    /**
     * Called when an element is decorated as a list.
     */
    decorate: function() {
      InlineEditableItemList.prototype.decorate.call(this);

      this.classList.add('settings-list');

      for (var parentNode = this.parentNode; parentNode;
           parentNode = parentNode.parentNode) {
        if (parentNode.hasAttribute('contentType')) {
          this.contentType = parentNode.getAttribute('contentType');
          break;
        }
      }

      if (!this.isEditable())
        this.tabIndex = 0;

      this.mode = this.getAttribute('mode');
      this.autoExpands = true;
      this.reset();
    },

    /**
     * Creates an item to go in the list.
     *
     * @param {Object} entry The element from the data model for this row.
     */
    createItem: function(entry) {
      if (entry) {
        return new ExceptionsListItem(this.contentType,
                                      this.mode,
                                      entry);
      } else {
        var addRowItem = new ExceptionsAddRowListItem(this.contentType,
                                                      this.mode);
        addRowItem.deletable = false;
        return addRowItem;
      }
    },

    /**
     * Sets the exceptions in the js model.
     *
     * @param {Array<options.Exception>} entries A list of dictionaries of
     *     values, each dictionary represents an exception.
     */
    setExceptions: function(entries) {
      var deleteCount = this.dataModel.length;

      if (this.isEditable()) {
        // We don't want to remove the Add New Exception row.
        deleteCount = deleteCount - 1;
      }

      var args = [0, deleteCount];
      args.push.apply(args, entries);
      this.dataModel.splice.apply(this.dataModel, args);
    },

    /**
     * The browser has finished checking a pattern for validity. Update the list
     * item to reflect this.
     *
     * @param {string} pattern The pattern.
     * @param {boolean} valid Whether said pattern is valid in the context of a
     *     content exception setting.
     */
    patternValidityCheckComplete: function(pattern, valid) {
      var listItems = this.items;
      for (var i = 0; i < listItems.length; i++) {
        var listItem = listItems[i];
        // Don't do anything for messages for the item if it is not the intended
        // recipient, or if the response is stale (i.e. the input value has
        // changed since we sent the request to analyze it).
        if (pattern == listItem.input.value)
          listItem.setPatternValid(valid);
      }
    },

    /**
     * Returns whether the rows are editable in this list.
     */
    isEditable: function() {
      // Exceptions of the following lists are not editable for now.
      return isEditableType(this.contentType);
    },

    /**
     * Removes all exceptions from the js model.
     */
    reset: function() {
      if (this.isEditable()) {
        // The null creates the Add New Exception row.
        this.dataModel = new ArrayDataModel([null]);
      } else {
        this.dataModel = new ArrayDataModel([]);
      }
    },

    /** @override */
    deleteItemAtIndex: function(index) {
      var listItem = this.getListItemByIndex(index);
      if (!listItem.deletable)
        return;

      var dataItem = listItem.dataItem;
      var params = [listItem.contentType,
                    listItem.mode,
                    dataItem.origin,
                    dataItem.embeddingOrigin];

      if (isChosenObjectType(this.contentType))
        params.push(dataItem.object);

      chrome.send('removeException', params);
    },
  };

  var Page = cr.ui.pageManager.Page;
  var PageManager = cr.ui.pageManager.PageManager;

  /**
   * Encapsulated handling of content settings list subpage.
   *
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function ContentSettingsExceptionsArea() {
    Page.call(this, 'contentExceptions',
              loadTimeData.getString('contentSettingsPageTabTitle'),
              'content-settings-exceptions-area');
  }

  cr.addSingletonGetter(ContentSettingsExceptionsArea);

  ContentSettingsExceptionsArea.prototype = {
    __proto__: Page.prototype,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      var exceptionsLists = this.pageDiv.querySelectorAll('list');
      for (var i = 0; i < exceptionsLists.length; i++) {
        options.contentSettings.ExceptionsList.decorate(exceptionsLists[i]);
      }

      ContentSettingsExceptionsArea.hideOTRLists(false);

      // If the user types in the URL without a hash, show just cookies.
      this.showList('cookies');

      $('content-settings-exceptions-overlay-confirm').onclick =
          PageManager.closeOverlay.bind(PageManager);
    },

    /**
     * Shows one list and hides all others.
     *
     * @param {string} type The content type.
     */
    showList: function(type) {
      // Update the title for the type that was shown.
      this.title = loadTimeData.getString(type + 'TabTitle');

      var header = this.pageDiv.querySelector('h1');
      var camelCasedType = type.replace(/-([a-z])/g, function(g) {
        return g[1].toUpperCase();
      });
      header.textContent = loadTimeData.getString(camelCasedType + 'Header');

      var divs = this.pageDiv.querySelectorAll('div[contentType]');
      for (var i = 0; i < divs.length; i++) {
        if (divs[i].getAttribute('contentType') == type)
          divs[i].hidden = false;
        else
          divs[i].hidden = true;
      }

      var valueColumnId = valueColumnForContentType(type);
      var headers =
          this.pageDiv.querySelectorAll('div.exception-value-column-header');
      for (var i = 0; i < headers.length; ++i)
        headers[i].hidden = (headers[i].id != valueColumnId);
    },

    /**
     * Called after the page has been shown. Show the content type for the
     * location's hash.
     */
    didShowPage: function() {
      if (this.hash)
        this.showList(this.hash.slice(1));
    },
  };

  /**
   * Called when the last incognito window is closed.
   */
  ContentSettingsExceptionsArea.OTRProfileDestroyed = function() {
    this.hideOTRLists(true);
  };

  /**
   * Hides the incognito exceptions lists and optionally clears them as well.
   * @param {boolean} clear Whether to clear the lists.
   */
  ContentSettingsExceptionsArea.hideOTRLists = function(clear) {
    var otrLists = document.querySelectorAll('list[mode=otr]');

    for (var i = 0; i < otrLists.length; i++) {
      otrLists[i].parentNode.hidden = true;
      if (clear)
        otrLists[i].reset();
    }
  };

  return {
    ExceptionsListItem: ExceptionsListItem,
    ExceptionsAddRowListItem: ExceptionsAddRowListItem,
    ExceptionsList: ExceptionsList,
    ContentSettingsExceptionsArea: ContentSettingsExceptionsArea,
  };
});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {

  //////////////////////////////////////////////////////////////////////////////
  // ContentSettingsRadio class:

  // Define a constructor that uses an input element as its underlying element.
  var ContentSettingsRadio = cr.ui.define('input');

  ContentSettingsRadio.prototype = {
    __proto__: HTMLInputElement.prototype,

    /**
     * Initialization function for the cr.ui framework.
     */
    decorate: function() {
      this.type = 'radio';
      var self = this;

      this.addEventListener('change',
          function(e) {
            chrome.send('setContentFilter', [this.name, this.value]);
          });
    },
  };

  /**
   * Whether the content setting is controlled by something else than the user's
   * settings (either 'policy' or 'extension').
   */
  cr.defineProperty(ContentSettingsRadio, 'controlledBy', cr.PropertyKind.ATTR);

  //////////////////////////////////////////////////////////////////////////////
  // HandlersEnabledRadio class:

  // Define a constructor that uses an input element as its underlying element.
  var HandlersEnabledRadio = cr.ui.define('input');

  HandlersEnabledRadio.prototype = {
    __proto__: HTMLInputElement.prototype,

    /**
     * Initialization function for the cr.ui framework.
     */
    decorate: function() {
      this.type = 'radio';
      var self = this;

      this.addEventListener('change',
          function(e) {
            chrome.send('setHandlersEnabled', [this.value == 'allow']);
          });
    },
  };

  // Export
  return {
    ContentSettingsRadio: ContentSettingsRadio,
    HandlersEnabledRadio: HandlersEnabledRadio
  };

});


// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /** @const */ var DeletableItemList = options.DeletableItemList;
  /** @const */ var DeletableItem = options.DeletableItem;
  /** @const */ var ArrayDataModel = cr.ui.ArrayDataModel;
  /** @const */ var ListSingleSelectionModel = cr.ui.ListSingleSelectionModel;

  // This structure maps the various cookie type names from C++ (hence the
  // underscores) to arrays of the different types of data each has, along with
  // the i18n name for the description of that data type.
  /** @const */ var cookieInfo = {
    'cookie': [['name', 'label_cookie_name'],
               ['content', 'label_cookie_content'],
               ['domain', 'label_cookie_domain'],
               ['path', 'label_cookie_path'],
               ['sendfor', 'label_cookie_send_for'],
               ['accessibleToScript', 'label_cookie_accessible_to_script'],
               ['created', 'label_cookie_created'],
               ['expires', 'label_cookie_expires']],
    'app_cache': [['manifest', 'label_app_cache_manifest'],
                  ['size', 'label_local_storage_size'],
                  ['created', 'label_cookie_created'],
                  ['accessed', 'label_cookie_last_accessed']],
    'database': [['name', 'label_cookie_name'],
                 ['desc', 'label_webdb_desc'],
                 ['size', 'label_local_storage_size'],
                 ['modified', 'label_local_storage_last_modified']],
    'local_storage': [['origin', 'label_local_storage_origin'],
                      ['size', 'label_local_storage_size'],
                      ['modified', 'label_local_storage_last_modified']],
    'indexed_db': [['origin', 'label_indexed_db_origin'],
                   ['size', 'label_indexed_db_size'],
                   ['modified', 'label_indexed_db_last_modified']],
    'file_system': [['origin', 'label_file_system_origin'],
                    ['persistent', 'label_file_system_persistent_usage'],
                    ['temporary', 'label_file_system_temporary_usage']],
    'channel_id': [['serverId', 'label_channel_id_server_id'],
                          ['certType', 'label_channel_id_type'],
                          ['created', 'label_channel_id_created']],
    'service_worker': [['origin', 'label_service_worker_origin'],
                       ['size', 'label_service_worker_size'],
                       ['scopes', 'label_service_worker_scopes']],
    'cache_storage': [['origin', 'label_cache_storage_origin'],
                       ['size', 'label_cache_storage_size'],
                       ['modified', 'label_cache_storage_last_modified']],
    'flash_lso': [['domain', 'label_cookie_domain']],
  };

  /**
   * Returns the item's height, like offsetHeight but such that it works better
   * when the page is zoomed. See the similar calculation in @{code cr.ui.List}.
   * This version also accounts for the animation done in this file.
   * @param {Element} item The item to get the height of.
   * @return {number} The height of the item, calculated with zooming in mind.
   */
  function getItemHeight(item) {
    var height = item.style.height;
    // Use the fixed animation target height if set, in case the element is
    // currently being animated and we'd get an intermediate height below.
    if (height && height.substr(-2) == 'px')
      return parseInt(height.substr(0, height.length - 2), 10);
    return item.getBoundingClientRect().height;
  }

  /**
   * Create tree nodes for the objects in the data array, and insert them all
   * into the given list using its @{code splice} method at the given index.
   * @param {Array<Object>} data The data objects for the nodes to add.
   * @param {number} start The index at which to start inserting the nodes.
   * @return {Array<options.CookieTreeNode>} An array of CookieTreeNodes added.
   */
  function spliceTreeNodes(data, start, list) {
    var nodes = data.map(function(x) { return new CookieTreeNode(x); });
    // Insert [start, 0] at the beginning of the array of nodes, making it
    // into the arguments we want to pass to @{code list.splice} below.
    nodes.splice(0, 0, start, 0);
    list.splice.apply(list, nodes);
    // Remove the [start, 0] prefix and return the array of nodes.
    nodes.splice(0, 2);
    return nodes;
  }

  /**
   * Adds information about an app that protects this data item to the
   * |element|.
   * @param {Element} element The DOM element the information should be
         appended to.
   * @param {{id: string, name: string}} appInfo Information about an app.
   */
  function addAppInfo(element, appInfo) {
    var img = element.ownerDocument.createElement('img');
    img.src = 'http://chromesettings.github.io/extension-icon/' + appInfo.id + '/16/1';
    element.title = loadTimeData.getString('label_protected_by_apps') +
                    ' ' + appInfo.name;
    img.className = 'protecting-app';
    element.appendChild(img);
  }

  var parentLookup = {};
  var lookupRequests = {};

  /**
   * Creates a new list item for sites data. Note that these are created and
   * destroyed lazily as they scroll into and out of view, so they must be
   * stateless. We cache the expanded item in @{code CookiesList} though, so it
   * can keep state. (Mostly just which item is selected.)
   * @param {Object} origin Data used to create a cookie list item.
   * @param {options.CookiesList} list The list that will contain this item.
   * @constructor
   * @extends {options.DeletableItem}
   */
  function CookieListItem(origin, list) {
    var listItem = new DeletableItem();
    listItem.__proto__ = CookieListItem.prototype;

    listItem.origin = origin;
    listItem.list = list;
    listItem.decorate();

    // This hooks up updateOrigin() to the list item, makes the top-level
    // tree nodes (i.e., origins) register their IDs in parentLookup, and
    // causes them to request their children if they have none. Note that we
    // have special logic in the setter for the parent property to make sure
    // that we can still garbage collect list items when they scroll out of
    // view, even though it appears that we keep a direct reference.
    if (origin) {
      origin.parent = listItem;
      origin.updateOrigin();
    }

    return listItem;
  }

  CookieListItem.prototype = {
    __proto__: DeletableItem.prototype,

    /** @override */
    decorate: function() {
      this.siteChild = this.ownerDocument.createElement('div');
      this.siteChild.className = 'cookie-site';
      this.dataChild = this.ownerDocument.createElement('div');
      this.dataChild.className = 'cookie-data';
      this.sizeChild = this.ownerDocument.createElement('div');
      this.sizeChild.className = 'cookie-size';
      this.itemsChild = this.ownerDocument.createElement('div');
      this.itemsChild.className = 'cookie-items';
      this.infoChild = this.ownerDocument.createElement('div');
      this.infoChild.className = 'cookie-details';
      this.infoChild.hidden = true;

      var remove = this.ownerDocument.createElement('button');
      remove.textContent = loadTimeData.getString('remove_cookie');
      remove.onclick = this.removeCookie_.bind(this);
      this.infoChild.appendChild(remove);
      var content = this.contentElement;
      content.appendChild(this.siteChild);
      content.appendChild(this.dataChild);
      content.appendChild(this.sizeChild);
      content.appendChild(this.itemsChild);
      this.itemsChild.appendChild(this.infoChild);
      if (this.origin && this.origin.data) {
        this.siteChild.textContent = this.origin.data.title;
        this.siteChild.setAttribute('title', this.origin.data.title);
      }
      this.itemList_ = [];
    },

    /** @type {boolean} */
    get expanded() {
      return this.expanded_;
    },
    set expanded(expanded) {
      if (this.expanded_ == expanded)
        return;
      this.expanded_ = expanded;
      if (expanded) {
        this.classList.add('show-items');
        var oldExpanded = this.list.expandedItem;
        this.list.expandedItem = this;
        this.updateItems_();
        if (oldExpanded)
          oldExpanded.expanded = false;
      } else {
        if (this.list.expandedItem == this) {
          this.list.expandedItem = null;
        }
        this.style.height = '';
        this.itemsChild.style.height = '';
        this.classList.remove('show-items');
      }
    },

    /**
     * The callback for the "remove" button shown when an item is selected.
     * Requests that the currently selected cookie be removed.
     * @private
     */
    removeCookie_: function() {
      if (this.selectedIndex_ >= 0) {
        var item = this.itemList_[this.selectedIndex_];
        if (item && item.node)
          chrome.send('removeCookie', [item.node.pathId]);
      }
    },

    /**
     * Disable animation within this cookie list item, in preparation for making
     * changes that will need to be animated. Makes it possible to measure the
     * contents without displaying them, to set animation targets.
     * @private
     */
    disableAnimation_: function() {
      this.itemsHeight_ = getItemHeight(this.itemsChild);
      this.classList.add('measure-items');
    },

    /**
     * Enable animation after changing the contents of this cookie list item.
     * See @{code disableAnimation_}.
     * @private
     */
    enableAnimation_: function() {
      if (!this.classList.contains('measure-items'))
        this.disableAnimation_();
      this.itemsChild.style.height = '';
      // This will force relayout in order to calculate the new heights.
      var itemsHeight = getItemHeight(this.itemsChild);
      var fixedHeight = getItemHeight(this) + itemsHeight - this.itemsHeight_;
      this.itemsChild.style.height = this.itemsHeight_ + 'px';
      // Force relayout before enabling animation, so that if we have
      // changed things since the last layout, they will not be animated
      // during subsequent layouts.
      /** @suppress {suspiciousCode} */
      this.itemsChild.offsetHeight;
      this.classList.remove('measure-items');
      this.itemsChild.style.height = itemsHeight + 'px';
      this.style.height = fixedHeight + 'px';
    },

    /**
     * Updates the origin summary to reflect changes in its items.
     * Both CookieListItem and CookieTreeNode implement this API.
     * This implementation scans the descendants to update the text.
     */
    updateOrigin: function() {
      var info = {
        cookies: 0,
        database: false,
        localStorage: false,
        appCache: false,
        indexedDb: false,
        fileSystem: false,
        channelIDs: 0,
        serviceWorker: false,
        cacheStorage: false,
      };
      if (this.origin)
        this.origin.collectSummaryInfo(info);

      var list = [];
      if (info.cookies > 1)
        list.push(loadTimeData.getStringF('cookie_plural', info.cookies));
      else if (info.cookies > 0)
        list.push(loadTimeData.getString('cookie_singular'));
      if (info.database || info.indexedDb)
        list.push(loadTimeData.getString('cookie_database_storage'));
      if (info.localStorage)
        list.push(loadTimeData.getString('cookie_local_storage'));
      if (info.appCache)
        list.push(loadTimeData.getString('cookie_app_cache'));
      if (info.fileSystem)
        list.push(loadTimeData.getString('cookie_file_system'));
      if (info.channelIDs)
        list.push(loadTimeData.getString('cookie_channel_id'));
      if (info.serviceWorker)
        list.push(loadTimeData.getString('cookie_service_worker'));
      if (info.cacheStorage)
        list.push(loadTimeData.getString('cookie_cache_storage'));
      if (info.flashLSO)
        list.push(loadTimeData.getString('cookie_flash_lso'));

      var text = '';
      for (var i = 0; i < list.length; ++i) {
        if (text.length > 0)
          text += ', ' + list[i];
        else
          text = list[i];
      }
      this.dataChild.textContent = text;

      var apps = info.appsProtectingThis;
      for (var key in apps) {
        addAppInfo(this.dataChild, apps[key]);
      }

      if (info.quota && info.quota.totalUsage)
        this.sizeChild.textContent = info.quota.totalUsage;

      if (this.expanded)
        this.updateItems_();
    },

    /**
     * Updates the items section to reflect changes, animating to the new state.
     * Removes existing contents and calls @{code CookieTreeNode.createItems}.
     * @private
     */
    updateItems_: function() {
      this.disableAnimation_();
      this.itemsChild.textContent = '';
      this.infoChild.hidden = true;
      this.selectedIndex_ = -1;
      this.itemList_ = [];
      if (this.origin)
        this.origin.createItems(this);
      this.itemsChild.appendChild(this.infoChild);
      this.enableAnimation_();
    },

    /**
     * Append a new cookie node "bubble" to this list item.
     * @param {options.CookieTreeNode} node The cookie node to add a bubble for.
     * @param {Element} div The DOM element for the bubble itself.
     * @return {number} The index the bubble was added at.
     */
    appendItem: function(node, div) {
      this.itemList_.push({node: node, div: div});
      this.itemsChild.appendChild(div);
      return this.itemList_.length - 1;
    },

    /**
     * The currently selected cookie node ("cookie bubble") index.
     * @type {number}
     * @private
     */
    selectedIndex_: -1,

    /**
     * Get the currently selected cookie node ("cookie bubble") index.
     * @type {number}
     */
    get selectedIndex() {
      return this.selectedIndex_;
    },

    /**
     * Set the currently selected cookie node ("cookie bubble") index to
     * |itemIndex|, unselecting any previously selected node first.
     * @param {number} itemIndex The index to set as the selected index.
     */
    set selectedIndex(itemIndex) {
      // Get the list index up front before we change anything.
      var index = this.list.getIndexOfListItem(this);
      // Unselect any previously selected item.
      if (this.selectedIndex_ >= 0) {
        var item = this.itemList_[this.selectedIndex_];
        if (item && item.div)
          item.div.removeAttribute('selected');
      }
      // Special case: decrementing -1 wraps around to the end of the list.
      if (itemIndex == -2)
        itemIndex = this.itemList_.length - 1;
      // Check if we're going out of bounds and hide the item details.
      if (itemIndex < 0 || itemIndex >= this.itemList_.length) {
        this.selectedIndex_ = -1;
        this.disableAnimation_();
        this.infoChild.hidden = true;
        this.enableAnimation_();
        return;
      }
      // Set the new selected item and show the item details for it.
      this.selectedIndex_ = itemIndex;
      this.itemList_[itemIndex].div.setAttribute('selected', '');
      this.disableAnimation_();
      this.itemList_[itemIndex].node.setDetailText(this.infoChild,
                                                   this.list.infoNodes);
      this.infoChild.hidden = false;
      this.enableAnimation_();
      // If we're near the bottom of the list this may cause the list item to go
      // beyond the end of the visible area. Fix it after the animation is done.
      var list = this.list;
      window.setTimeout(function() { list.scrollIndexIntoView(index); }, 150);
    },
  };

  /**
   * {@code CookieTreeNode}s mirror the structure of the cookie tree lazily, and
   * contain all the actual data used to generate the {@code CookieListItem}s.
   * @param {Object} data The data object for this node.
   * @constructor
   */
  function CookieTreeNode(data) {
    this.data = data;
    this.children = [];
  }

  CookieTreeNode.prototype = {
    /**
     * Insert the given list of cookie tree nodes at the given index.
     * Both CookiesList and CookieTreeNode implement this API.
     * @param {Array<Object>} data The data objects for the nodes to add.
     * @param {number} start The index at which to start inserting the nodes.
     */
    insertAt: function(data, start) {
      var nodes = spliceTreeNodes(data, start, this.children);
      for (var i = 0; i < nodes.length; i++)
        nodes[i].parent = this;
      this.updateOrigin();
    },

    /**
     * Remove a cookie tree node from the given index.
     * Both CookiesList and CookieTreeNode implement this API.
     * @param {number} index The index of the tree node to remove.
     */
    remove: function(index) {
      if (index < this.children.length) {
        this.children.splice(index, 1);
        this.updateOrigin();
      }
    },

    /**
     * Clears all children.
     * Both CookiesList and CookieTreeNode implement this API.
     * It is used by CookiesList.loadChildren().
     */
    clear: function() {
      // We might leave some garbage in parentLookup for removed children.
      // But that should be OK because parentLookup is cleared when we
      // reload the tree.
      this.children = [];
      this.updateOrigin();
    },

    /**
     * The counter used by startBatchUpdates() and endBatchUpdates().
     * @type {number}
     */
    batchCount_: 0,

    /**
     * See cr.ui.List.startBatchUpdates().
     * Both CookiesList (via List) and CookieTreeNode implement this API.
     */
    startBatchUpdates: function() {
      this.batchCount_++;
    },

    /**
     * See cr.ui.List.endBatchUpdates().
     * Both CookiesList (via List) and CookieTreeNode implement this API.
     */
    endBatchUpdates: function() {
      if (!--this.batchCount_)
        this.updateOrigin();
    },

    /**
     * Requests updating the origin summary to reflect changes in this item.
     * Both CookieListItem and CookieTreeNode implement this API.
     */
    updateOrigin: function() {
      if (!this.batchCount_ && this.parent)
        this.parent.updateOrigin();
    },

    /**
     * Summarize the information in this node and update @{code info}.
     * This will recurse into child nodes to summarize all descendants.
     * @param {Object} info The info object from @{code updateOrigin}.
     */
    collectSummaryInfo: function(info) {
      if (this.children.length > 0) {
        for (var i = 0; i < this.children.length; ++i)
          this.children[i].collectSummaryInfo(info);
      } else if (this.data && !this.data.hasChildren) {
        if (this.data.type == 'cookie') {
          info.cookies++;
        } else if (this.data.type == 'database') {
          info.database = true;
        } else if (this.data.type == 'local_storage') {
          info.localStorage = true;
        } else if (this.data.type == 'app_cache') {
          info.appCache = true;
        } else if (this.data.type == 'indexed_db') {
          info.indexedDb = true;
        } else if (this.data.type == 'file_system') {
          info.fileSystem = true;
        } else if (this.data.type == 'quota') {
          info.quota = this.data;
        } else if (this.data.type == 'channel_id') {
          info.channelIDs++;
        } else if (this.data.type == 'service_worker') {
          info.serviceWorker = true;
        } else if (this.data.type == 'cache_storage') {
          info.cacheStorage = true;
        } else if (this.data.type == 'flash_lso') {
          info.flashLSO = true;
        }

        var apps = this.data.appsProtectingThis;
        if (apps) {
          if (!info.appsProtectingThis)
            info.appsProtectingThis = {};
          apps.forEach(function(appInfo) {
            info.appsProtectingThis[appInfo.id] = appInfo;
          });
        }
      }
    },

    /**
     * Create the cookie "bubbles" for this node, recursing into children
     * if there are any. Append the cookie bubbles to @{code item}.
     * @param {options.CookieListItem} item The cookie list item to create items
     *     in.
     */
    createItems: function(item) {
      if (this.children.length > 0) {
        for (var i = 0; i < this.children.length; ++i)
          this.children[i].createItems(item);
        return;
      }

      if (!this.data || this.data.hasChildren)
        return;

      var text = '';
      switch (this.data.type) {
        case 'cookie':
        case 'database':
          text = this.data.name;
          break;
        default:
          text = loadTimeData.getString('cookie_' + this.data.type);
      }
      if (!text)
        return;

      var div = item.ownerDocument.createElement('div');
      div.className = 'cookie-item';
      // Help out screen readers and such: this is a clickable thing.
      div.setAttribute('role', 'button');
      div.textContent = text;
      var apps = this.data.appsProtectingThis;
      if (apps)
        apps.forEach(addAppInfo.bind(null, div));

      var index = item.appendItem(this, div);
      div.onclick = function() {
        item.selectedIndex = (item.selectedIndex == index) ? -1 : index;
      };
    },

    /**
     * Set the detail text to be displayed to that of this cookie tree node.
     * Uses preallocated DOM elements for each cookie node type from @{code
     * infoNodes}, and inserts the appropriate elements to @{code element}.
     * @param {Element} element The DOM element to insert elements to.
     * @param {Object<{table: Element, info: Object<Element>}>} infoNodes The
     *     map from cookie node types to maps from cookie attribute names to DOM
     *     elements to display cookie attribute values, created by
     *     @see {CookiesList.decorate}.
     */
    setDetailText: function(element, infoNodes) {
      var table;
      if (this.data && !this.data.hasChildren && cookieInfo[this.data.type]) {
        var info = cookieInfo[this.data.type];
        var nodes = infoNodes[this.data.type].info;
        for (var i = 0; i < info.length; ++i) {
          var name = info[i][0];
          if (name != 'id' && this.data[name])
            nodes[name].textContent = this.data[name];
          else
            nodes[name].textContent = '';
        }
        table = infoNodes[this.data.type].table;
      }

      while (element.childNodes.length > 1)
        element.removeChild(element.firstChild);

      if (table)
        element.insertBefore(table, element.firstChild);
    },

    /**
     * The parent of this cookie tree node.
     * @type {?(options.CookieTreeNode|options.CookieListItem)}
     */
    get parent() {
      // See below for an explanation of this special case.
      if (typeof this.parent_ == 'number')
        return this.list_.getListItemByIndex(this.parent_);
      return this.parent_;
    },
    set parent(parent) {
      if (parent == this.parent)
        return;

      if (parent instanceof CookieListItem) {
        // If the parent is to be a CookieListItem, then we keep the reference
        // to it by its containing list and list index, rather than directly.
        // This allows the list items to be garbage collected when they scroll
        // out of view (except the expanded item, which we cache). This is
        // transparent except in the setter and getter, where we handle it.
        if (this.parent_ == undefined || parent.listIndex != -1) {
          // Setting the parent is somewhat tricky because the CookieListItem
          // constructor has side-effects on the |origin| that it wraps. Every
          // time a CookieListItem is created for an |origin|, it registers
          // itself as the parent of the |origin|.
          // The List implementation may create a temporary CookieListItem item
          // that wraps the |origin| of the very first entry of the CokiesList,
          // when the List is redrawn the first time. This temporary
          // CookieListItem is fresh (has listIndex = -1) and is never inserted
          // into the List. Therefore it gets never updated. This destroys the
          // chain of parent pointers.
          // This is the stack trace:
          //     CookieListItem
          //     CookiesList.createItem
          //     List.measureItem
          //     List.getDefaultItemSize_
          //     List.getDefaultItemHeight_
          //     List.getIndexForListOffset_
          //     List.getItemsInViewPort
          //     List.redraw
          //     List.endBatchUpdates
          //     CookiesList.loadChildren
          this.parent_ = parent.listIndex;
        }
        this.list_ = parent.list;
        parent.addEventListener('listIndexChange',
                                this.parentIndexChanged_.bind(this));
      } else {
        this.parent_ = parent;
      }

      if (this.data && this.data.id) {
        if (parent)
          parentLookup[this.data.id] = this;
        else
          delete parentLookup[this.data.id];
      }

      if (this.data && this.data.hasChildren &&
          !this.children.length && !lookupRequests[this.data.id]) {
        lookupRequests[this.data.id] = true;
        chrome.send('loadCookie', [this.pathId]);
      }
    },

    /**
     * Called when the parent is a CookieListItem whose index has changed.
     * See the code above that avoids keeping a direct reference to
     * CookieListItem parents, to allow them to be garbage collected.
     * @private
     */
    parentIndexChanged_: function(event) {
      if (typeof this.parent_ == 'number') {
        this.parent_ = event.newValue;
        // We set a timeout to update the origin, rather than doing it right
        // away, because this callback may occur while the list items are
        // being repopulated following a scroll event. Calling updateOrigin()
        // immediately could trigger relayout that would reset the scroll
        // position within the list, among other things.
        window.setTimeout(this.updateOrigin.bind(this), 0);
      }
    },

    /**
     * The cookie tree path id.
     * @type {string}
     */
    get pathId() {
      var parent = this.parent;
      if (parent && parent instanceof CookieTreeNode)
        return parent.pathId + ',' + this.data.id;
      return this.data.id;
    },
  };

  /**
   * Creates a new cookies list.
   * @param {Object=} opt_propertyBag Optional properties.
   * @constructor
   * @extends {options.DeletableItemList}
   */
  var CookiesList = cr.ui.define('list');

  CookiesList.prototype = {
    __proto__: DeletableItemList.prototype,

    /** @override */
    decorate: function() {
      DeletableItemList.prototype.decorate.call(this);
      this.classList.add('cookie-list');
      this.dataModel = new ArrayDataModel([]);
      this.addEventListener('keydown', this.handleKeyLeftRight_.bind(this));
      var sm = new ListSingleSelectionModel();
      sm.addEventListener('change', this.cookieSelectionChange_.bind(this));
      sm.addEventListener('leadIndexChange', this.cookieLeadChange_.bind(this));
      this.selectionModel = sm;
      this.infoNodes = {};
      this.fixedHeight = false;
      var doc = this.ownerDocument;
      // Create a table for each type of site data (e.g. cookies, databases,
      // etc.) and save it so that we can reuse it for all origins.
      for (var type in cookieInfo) {
        var table = doc.createElement('table');
        table.className = 'cookie-details-table';
        var tbody = doc.createElement('tbody');
        table.appendChild(tbody);
        var info = {};
        for (var i = 0; i < cookieInfo[type].length; i++) {
          var tr = doc.createElement('tr');
          var name = doc.createElement('td');
          var data = doc.createElement('td');
          var pair = cookieInfo[type][i];
          name.className = 'cookie-details-label';
          name.textContent = loadTimeData.getString(pair[1]);
          data.className = 'cookie-details-value';
          data.textContent = '';
          tr.appendChild(name);
          tr.appendChild(data);
          tbody.appendChild(tr);
          info[pair[0]] = data;
        }
        this.infoNodes[type] = {table: table, info: info};
      }
    },

    /**
     * Handles key down events and looks for left and right arrows, then
     * dispatches to the currently expanded item, if any.
     * @param {Event} e The keydown event.
     * @private
     */
    handleKeyLeftRight_: function(e) {
      var id = e.keyIdentifier;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey)
        return;
      if ((id == 'Left' || id == 'Right') && this.expandedItem) {
        var cs = this.ownerDocument.defaultView.getComputedStyle(this);
        var rtl = cs.direction == 'rtl';
        if ((!rtl && id == 'Left') || (rtl && id == 'Right'))
          this.expandedItem.selectedIndex--;
        else
          this.expandedItem.selectedIndex++;
        this.scrollIndexIntoView(this.expandedItem.listIndex);
        // Prevent the page itself from scrolling.
        e.preventDefault();
      }
    },

    /**
     * Called on selection model selection changes.
     * @param {Event} ce The selection change event.
     * @private
     */
    cookieSelectionChange_: function(ce) {
      ce.changes.forEach(function(change) {
          var listItem = this.getListItemByIndex(change.index);
          if (listItem) {
            if (!change.selected) {
              // We set a timeout here, rather than setting the item unexpanded
              // immediately, so that if another item gets set expanded right
              // away, it will be expanded before this item is unexpanded. It
              // will notice that, and unexpand this item in sync with its own
              // expansion. Later, this callback will end up having no effect.
              window.setTimeout(function() {
                if (!listItem.selected || !listItem.lead)
                  listItem.expanded = false;
              }, 0);
            } else if (listItem.lead) {
              listItem.expanded = true;
            }
          }
        }, this);
    },

    /**
     * Called on selection model lead changes.
     * @param {Event} pe The lead change event.
     * @private
     */
    cookieLeadChange_: function(pe) {
      if (pe.oldValue != -1) {
        var listItem = this.getListItemByIndex(pe.oldValue);
        if (listItem) {
          // See cookieSelectionChange_ above for why we use a timeout here.
          window.setTimeout(function() {
            if (!listItem.lead || !listItem.selected)
              listItem.expanded = false;
          }, 0);
        }
      }
      if (pe.newValue != -1) {
        var listItem = this.getListItemByIndex(pe.newValue);
        if (listItem && listItem.selected)
          listItem.expanded = true;
      }
    },

    /**
     * The currently expanded item. Used by CookieListItem above.
     * @type {?options.CookieListItem}
     */
    expandedItem: null,

    // from cr.ui.List
    /**
     * @override
     * @param {Object} data
     */
    createItem: function(data) {
      // We use the cached expanded item in order to allow it to maintain some
      // state (like its fixed height, and which bubble is selected).
      if (this.expandedItem && this.expandedItem.origin == data)
        return this.expandedItem;
      return new CookieListItem(data, this);
    },

    // from options.DeletableItemList
    /** @override */
    deleteItemAtIndex: function(index) {
      var item = this.dataModel.item(index);
      if (item) {
        var pathId = item.pathId;
        if (pathId)
          chrome.send('removeCookie', [pathId]);
      }
    },

    /**
     * Insert the given list of cookie tree nodes at the given index.
     * Both CookiesList and CookieTreeNode implement this API.
     * @param {Array<Object>} data The data objects for the nodes to add.
     * @param {number} start The index at which to start inserting the nodes.
     */
    insertAt: function(data, start) {
      spliceTreeNodes(data, start, this.dataModel);
    },

    /**
     * Remove a cookie tree node from the given index.
     * Both CookiesList and CookieTreeNode implement this API.
     * @param {number} index The index of the tree node to remove.
     */
    remove: function(index) {
      if (index < this.dataModel.length)
        this.dataModel.splice(index, 1);
    },

    /**
     * Clears the list.
     * Both CookiesList and CookieTreeNode implement this API.
     * It is used by CookiesList.loadChildren().
     */
    clear: function() {
      parentLookup = {};
      this.dataModel.splice(0, this.dataModel.length);
      this.redraw();
    },

    /**
     * Add tree nodes by given parent.
     * @param {Object} parent The parent node.
     * @param {number} start The index at which to start inserting the nodes.
     * @param {Array} nodesData Nodes data array.
     * @private
     */
    addByParent_: function(parent, start, nodesData) {
      if (!parent)
        return;

      parent.startBatchUpdates();
      parent.insertAt(nodesData, start);
      parent.endBatchUpdates();

      cr.dispatchSimpleEvent(this, 'change');
    },

    /**
     * Add tree nodes by parent id.
     * This is used by cookies_view.js.
     * @param {string} parentId Id of the parent node.
     * @param {number} start The index at which to start inserting the nodes.
     * @param {Array} nodesData Nodes data array.
     */
    addByParentId: function(parentId, start, nodesData) {
      var parent = parentId ? parentLookup[parentId] : this;
      this.addByParent_(parent, start, nodesData);
    },

    /**
     * Removes tree nodes by parent id.
     * This is used by cookies_view.js.
     * @param {string} parentId Id of the parent node.
     * @param {number} start The index at which to start removing the nodes.
     * @param {number} count Number of nodes to remove.
     */
    removeByParentId: function(parentId, start, count) {
      var parent = parentId ? parentLookup[parentId] : this;
      if (!parent)
        return;

      parent.startBatchUpdates();
      while (count-- > 0)
        parent.remove(start);
      parent.endBatchUpdates();

      cr.dispatchSimpleEvent(this, 'change');
    },

    /**
     * Loads the immediate children of given parent node.
     * This is used by cookies_view.js.
     * @param {string} parentId Id of the parent node.
     * @param {Array} children The immediate children of parent node.
     */
    loadChildren: function(parentId, children) {
      if (parentId)
        delete lookupRequests[parentId];
      var parent = parentId ? parentLookup[parentId] : this;
      if (!parent)
        return;

      parent.startBatchUpdates();
      parent.clear();
      this.addByParent_(parent, 0, children);
      parent.endBatchUpdates();
    },
  };

  return {
    CookiesList: CookiesList,
    CookieListItem: CookieListItem,
    CookieTreeNode: CookieTreeNode,
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {

  var Page = cr.ui.pageManager.Page;
  var PageManager = cr.ui.pageManager.PageManager;

  /////////////////////////////////////////////////////////////////////////////
  // CookiesView class:

  /**
   * Encapsulated handling of the cookies and other site data page.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function CookiesView(model) {
    Page.call(this, 'cookies',
              loadTimeData.getString('cookiesViewPageTabTitle'),
              'cookies-view-page');
  }

  cr.addSingletonGetter(CookiesView);

  CookiesView.prototype = {
    __proto__: Page.prototype,

    /**
     * The timer id of the timer set on search query change events.
     * @type {number}
     * @private
     */
    queryDelayTimerId_: 0,

    /**
     * The most recent search query, empty string if the query is empty.
     * @type {string}
     * @private
     */
    lastQuery_: '',

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      var searchBox = this.pageDiv.querySelector('.cookies-search-box');
      searchBox.addEventListener(
          'search', this.handleSearchQueryChange_.bind(this));
      searchBox.onkeydown = function(e) {
        // Prevent the overlay from handling this event.
        if (e.keyIdentifier == 'Enter')
          e.stopPropagation();
      };

      this.pageDiv.querySelector('.remove-all-cookies-button').onclick =
          function(e) {
            chrome.send('removeAllCookies');
          };

      var cookiesList = this.pageDiv.querySelector('.cookies-list');
      options.CookiesList.decorate(cookiesList);

      this.addEventListener('visibleChange', this.handleVisibleChange_);

      this.pageDiv.querySelector('.cookies-view-overlay-confirm').onclick =
          PageManager.closeOverlay.bind(PageManager);
    },

    /** @override */
    didShowPage: function() {
      this.pageDiv.querySelector('.cookies-search-box').value = '';
      this.lastQuery_ = '';
    },

    /**
     * Search cookie using text in |cookies-search-box|.
     */
    searchCookie: function() {
      this.queryDelayTimerId_ = 0;
      var filter = this.pageDiv.querySelector('.cookies-search-box').value;
      if (this.lastQuery_ != filter) {
        this.lastQuery_ = filter;
        chrome.send('updateCookieSearchResults', [filter]);
      }
    },

    /**
     * Handles search query changes.
     * @param {!Event} e The event object.
     * @private
     */
    handleSearchQueryChange_: function(e) {
      var stringId = document.querySelector('.cookies-search-box').value ?
          'remove_all_shown_cookie' : 'remove_all_cookie';
      document.querySelector('.remove-all-cookies-button').innerHTML =
          loadTimeData.getString(stringId);
      if (this.queryDelayTimerId_)
        window.clearTimeout(this.queryDelayTimerId_);

      this.queryDelayTimerId_ = window.setTimeout(
          this.searchCookie.bind(this), 500);
    },

    initialized_: false,

    /**
     * Handler for Page's visible property change event.
     * @param {Event} e Property change event.
     * @private
     */
    handleVisibleChange_: function(e) {
      if (!this.visible)
        return;

      chrome.send('reloadCookies');

      if (!this.initialized_) {
        this.initialized_ = true;
        this.searchCookie();
      } else {
        this.pageDiv.querySelector('.cookies-list').redraw();
      }

      this.pageDiv.querySelector('.cookies-search-box').focus();
    },
  };

  // CookiesViewHandler callbacks.
  CookiesView.onTreeItemAdded = function(args) {
    $('cookies-list').addByParentId(args[0], args[1], args[2]);
  };

  CookiesView.onTreeItemRemoved = function(args) {
    $('cookies-list').removeByParentId(args[0], args[1], args[2]);
  };

  CookiesView.loadChildren = function(args) {
    $('cookies-list').loadChildren(args[0], args[1]);
  };

  // Export
  return {
    CookiesView: CookiesView
  };

});

// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  var Page = cr.ui.pageManager.Page;
  var PageManager = cr.ui.pageManager.PageManager;

  // UI state of the turn off overlay.
  // @enum {string}
  var UIState = {
    UNKNOWN: 'unknown',
    OFFLINE: 'offline',
    IDLE: 'idle',
    PENDING: 'pending',
    SERVER_ERROR: 'server-error',
  };

  /**
   * EasyUnlockTurnOffOverlay class
   * Encapsulated handling of the Factory Reset confirmation overlay page.
   * @class
   */
  function EasyUnlockTurnOffOverlay() {
    Page.call(this, 'easyUnlockTurnOffOverlay',
              loadTimeData.getString('easyUnlockTurnOffTitle'),
              'easy-unlock-turn-off-overlay');
  }

  cr.addSingletonGetter(EasyUnlockTurnOffOverlay);

  EasyUnlockTurnOffOverlay.prototype = {
    // Inherit EasyUnlockTurnOffOverlay from Page.
    __proto__: Page.prototype,

    /** Current UI state */
    uiState_: UIState.UNKNOWN,
    get uiState() {
      return this.uiState_;
    },
    set uiState(newUiState) {
      if (newUiState == this.uiState_)
        return;

      this.uiState_ = newUiState;
      switch (this.uiState_) {
        case UIState.OFFLINE:
          this.setUpOfflineUI_();
          break;
        case UIState.IDLE:
          this.setUpTurnOffUI_(false);
          break;
        case UIState.PENDING:
          this.setUpTurnOffUI_(true);
          break;
        case UIState.SERVER_ERROR:
          this.setUpServerErrorUI_();
          break;
        default:
          console.error('Unknow Easy unlock turn off UI state: ' +
                        this.uiState_);
          this.setUpTurnOffUI_(false);
          break;
      }
    },

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      $('easy-unlock-turn-off-dismiss').onclick = function(event) {
        EasyUnlockTurnOffOverlay.dismiss();
      };
      $('easy-unlock-turn-off-confirm').onclick = function(event) {
        this.uiState = UIState.PENDING;
        chrome.send('easyUnlockRequestTurnOff');
      }.bind(this);
    },

    /** @override */
    didShowPage: function() {
      if (navigator.onLine) {
        this.uiState = UIState.IDLE;
        chrome.send('easyUnlockGetTurnOffFlowStatus');
      } else {
        this.uiState = UIState.OFFLINE;
      }
    },

    /** @override */
    didClosePage: function() {
      chrome.send('easyUnlockTurnOffOverlayDismissed');
    },

    /**
     * Returns the button strip element.
     * @return {HTMLDivElement} The container div of action buttons.
     */
    get buttonStrip() {
      return this.pageDiv.querySelector('.button-strip');
    },

    /**
     * Set visibility of action buttons in button strip.
     * @private
     */
    setActionButtonsVisible_: function(visible) {
      var buttons = this.buttonStrip.querySelectorAll('button');
      for (var i = 0; i < buttons.length; ++i) {
        buttons[i].hidden = !visible;
      }
    },

    /**
     * Set visibility of spinner.
     * @private
     */
    setSpinnerVisible_: function(visible) {
      $('easy-unlock-turn-off-spinner').hidden = !visible;
    },

    /**
     * Set up UI for showing offline message.
     * @private
     */
    setUpOfflineUI_: function() {
      $('easy-unlock-turn-off-title').textContent =
          loadTimeData.getString('easyUnlockTurnOffOfflineTitle');
      $('easy-unlock-turn-off-messagee').textContent =
          loadTimeData.getString('easyUnlockTurnOffOfflineMessage');

      this.setActionButtonsVisible_(false);
      this.setSpinnerVisible_(false);
    },

    /**
     * Set up UI for turning off Easy Unlock.
     * @param {boolean} pending Whether there is a pending turn-off call.
     * @private
     */
    setUpTurnOffUI_: function(pending) {
      $('easy-unlock-turn-off-title').textContent =
          loadTimeData.getString('easyUnlockTurnOffTitle');
      $('easy-unlock-turn-off-messagee').textContent =
          loadTimeData.getString('easyUnlockTurnOffDescription');
      $('easy-unlock-turn-off-confirm').textContent =
          loadTimeData.getString('easyUnlockTurnOffButton');

      this.setActionButtonsVisible_(true);
      this.setSpinnerVisible_(pending);
      $('easy-unlock-turn-off-confirm').disabled = pending;
      $('easy-unlock-turn-off-dismiss').hidden = false;
    },

    /**
     * Set up UI for showing server error.
     * @private
     */
    setUpServerErrorUI_: function() {
      $('easy-unlock-turn-off-title').textContent =
          loadTimeData.getString('easyUnlockTurnOffErrorTitle');
      $('easy-unlock-turn-off-messagee').textContent =
          loadTimeData.getString('easyUnlockTurnOffErrorMessage');
      $('easy-unlock-turn-off-confirm').textContent =
          loadTimeData.getString('easyUnlockTurnOffRetryButton');

      this.setActionButtonsVisible_(true);
      this.setSpinnerVisible_(false);
      $('easy-unlock-turn-off-confirm').disabled = false;
      $('easy-unlock-turn-off-dismiss').hidden = true;
    },
  };

  /**
   * Closes the Easy unlock turn off overlay.
   */
  EasyUnlockTurnOffOverlay.dismiss = function() {
    PageManager.closeOverlay();
  };

  /**
   * Update UI to reflect the turn off operation status.
   * @param {string} newState The UIState string representing the new state.
   */
  EasyUnlockTurnOffOverlay.updateUIState = function(newState) {
    EasyUnlockTurnOffOverlay.getInstance().uiState = newState;
  };

  // Export
  return {
    EasyUnlockTurnOffOverlay: EasyUnlockTurnOffOverlay
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  var Page = cr.ui.pageManager.Page;
  var PageManager = cr.ui.pageManager.PageManager;

  /**
   * FactoryResetOverlay class
   * Encapsulated handling of the Factory Reset confirmation overlay page.
   * @class
   */
  function FactoryResetOverlay() {
    Page.call(this, 'factoryResetData',
              loadTimeData.getString('factoryResetTitle'),
              'factory-reset-overlay');
  }

  cr.addSingletonGetter(FactoryResetOverlay);

  FactoryResetOverlay.prototype = {
    // Inherit FactoryResetOverlay from Page.
    __proto__: Page.prototype,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      $('factory-reset-data-dismiss').onclick = function(event) {
        FactoryResetOverlay.dismiss();
      };
      $('factory-reset-data-restart').onclick = function(event) {
        chrome.send('performFactoryResetRestart');
      };
    },
  };

  FactoryResetOverlay.dismiss = function() {
    PageManager.closeOverlay();
  };

  // Export
  return {
    FactoryResetOverlay: FactoryResetOverlay
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {

  var OptionsPage = options.OptionsPage;
  var Page = cr.ui.pageManager.Page;
  var PageManager = cr.ui.pageManager.PageManager;

  /**
   * FontSettings class
   * Encapsulated handling of the 'Fonts and Encoding' page.
   * @class
   */
  function FontSettings() {
    Page.call(this, 'fonts',
              loadTimeData.getString('fontSettingsPageTabTitle'),
              'font-settings');
  }

  cr.addSingletonGetter(FontSettings);

  FontSettings.prototype = {
    __proto__: Page.prototype,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      var standardFontRange = $('standard-font-size');
      standardFontRange.valueMap = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20,
          22, 24, 26, 28, 30, 32, 34, 36, 40, 44, 48, 56, 64, 72];
      standardFontRange.addEventListener(
          'change', this.standardRangeChanged_.bind(this, standardFontRange));
      standardFontRange.addEventListener(
          'input', this.standardRangeChanged_.bind(this, standardFontRange));
      standardFontRange.customChangeHandler =
          this.standardFontSizeChanged_.bind(standardFontRange);

      var minimumFontRange = $('minimum-font-size');
      minimumFontRange.valueMap = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
          18, 20, 22, 24];
      minimumFontRange.addEventListener(
          'change', this.minimumRangeChanged_.bind(this, minimumFontRange));
      minimumFontRange.addEventListener(
          'input', this.minimumRangeChanged_.bind(this, minimumFontRange));
      minimumFontRange.customChangeHandler =
          this.minimumFontSizeChanged_.bind(minimumFontRange);

      var placeholder = loadTimeData.getString('fontSettingsPlaceholder');
      var elements = [$('standard-font-family'), $('serif-font-family'),
                      $('sans-serif-font-family'), $('fixed-font-family'),
                      $('font-encoding')];
      elements.forEach(function(el) {
        el.appendChild(new Option(placeholder));
        el.setDisabled('noFontsAvailable', true);
      });

      $('font-settings-confirm').onclick = function() {
        PageManager.closeOverlay();
      };

      $('advanced-font-settings-options').onclick = function() {
        chrome.send('openAdvancedFontSettingsOptions');
      };
    },

    /** @override */
    didShowPage: function() {
      // The fonts list may be large so we only load it when this page is
      // loaded for the first time.  This makes opening the options window
      // faster and consume less memory if the user never opens the fonts
      // dialog.
      if (!this.hasShown) {
        chrome.send('fetchFontsData');
        this.hasShown = true;
      }
    },

    /**
     * Handler that is called when the user changes the position of the standard
     * font size slider. This allows the UI to show a preview of the change
     * before the slider has been released and the associated prefs updated.
     * @param {Element} el The slider input element.
     * @param {Event} event Change event.
     * @private
     */
    standardRangeChanged_: function(el, event) {
      var size = el.mapPositionToPref(el.value);
      var fontSampleEl = $('standard-font-sample');
      this.setUpFontSample_(fontSampleEl, size, fontSampleEl.style.fontFamily,
                            true);

      fontSampleEl = $('serif-font-sample');
      this.setUpFontSample_(fontSampleEl, size, fontSampleEl.style.fontFamily,
                            true);

      fontSampleEl = $('sans-serif-font-sample');
      this.setUpFontSample_(fontSampleEl, size, fontSampleEl.style.fontFamily,
                            true);

      fontSampleEl = $('fixed-font-sample');
      this.setUpFontSample_(fontSampleEl,
                            size - OptionsPage.SIZE_DIFFERENCE_FIXED_STANDARD,
                            fontSampleEl.style.fontFamily, false);
    },

    /**
     * Sets the 'default_fixed_font_size' preference when the user changes the
     * standard font size.
     * @param {Event} event Change event.
     * @private
     */
    standardFontSizeChanged_: function(event) {
      var size = this.mapPositionToPref(this.value);
      Preferences.setIntegerPref(
        'webkit.webprefs.default_fixed_font_size',
        size - OptionsPage.SIZE_DIFFERENCE_FIXED_STANDARD, true);
      return false;
    },

    /**
     * Handler that is called when the user changes the position of the minimum
     * font size slider. This allows the UI to show a preview of the change
     * before the slider has been released and the associated prefs updated.
     * @param {Element} el The slider input element.
     * @param {Event} event Change event.
     * @private
     */
    minimumRangeChanged_: function(el, event) {
      var size = el.mapPositionToPref(el.value);
      var fontSampleEl = $('minimum-font-sample');
      this.setUpFontSample_(fontSampleEl, size, fontSampleEl.style.fontFamily,
                            true);
    },

    /**
     * Sets the 'minimum_logical_font_size' preference when the user changes the
     * minimum font size.
     * @param {Event} event Change event.
     * @private
     */
    minimumFontSizeChanged_: function(event) {
      var size = this.mapPositionToPref(this.value);
      Preferences.setIntegerPref(
        'webkit.webprefs.minimum_logical_font_size', size, true);
      return false;
    },

    /**
     * Sets the text, font size and font family of the sample text.
     * @param {Element} el The div containing the sample text.
     * @param {number} size The font size of the sample text.
     * @param {string} font The font family of the sample text.
     * @param {boolean} showSize True if the font size should appear in the
     *     sample.
     * @private
     */
    setUpFontSample_: function(el, size, font, showSize) {
      var prefix = showSize ? (size + ': ') : '';
      el.textContent = prefix +
          loadTimeData.getString('fontSettingsLoremIpsum');
      el.style.fontSize = size + 'px';
      if (font)
        el.style.fontFamily = font;
    },

    /**
     * Populates a select list and selects the specified item.
     * @param {Element} element The select element to populate.
     * @param {Array} items The array of items from which to populate.
     * @param {string} selectedValue The selected item.
     * @private
     */
    populateSelect_: function(element, items, selectedValue) {
      // Remove any existing content.
      element.textContent = '';

      // Insert new child nodes into select element.
      for (var i = 0; i < items.length; i++) {
        var value = items[i][0];
        var text = items[i][1];
        var dir = items[i][2];
        if (text) {
          var selected = value == selectedValue;
          var option = new Option(text, value, false, selected);
          option.dir = dir;
          element.appendChild(option);
        } else {
          element.appendChild(document.createElement('hr'));
        }
      }

      element.setDisabled('noFontsAvailable', false);
    }
  };

  // Chrome callbacks
  FontSettings.setFontsData = function(fonts, encodings, selectedValues) {
    FontSettings.getInstance().populateSelect_($('standard-font-family'), fonts,
                                               selectedValues[0]);
    FontSettings.getInstance().populateSelect_($('serif-font-family'), fonts,
                                               selectedValues[1]);
    FontSettings.getInstance().populateSelect_($('sans-serif-font-family'),
                                               fonts, selectedValues[2]);
    FontSettings.getInstance().populateSelect_($('fixed-font-family'), fonts,
                                               selectedValues[3]);
    FontSettings.getInstance().populateSelect_($('font-encoding'), encodings,
                                               selectedValues[4]);
  };

  FontSettings.setUpStandardFontSample = function(font, size) {
    FontSettings.getInstance().setUpFontSample_($('standard-font-sample'), size,
                                                font, true);
  };

  FontSettings.setUpSerifFontSample = function(font, size) {
    FontSettings.getInstance().setUpFontSample_($('serif-font-sample'), size,
                                                font, true);
  };

  FontSettings.setUpSansSerifFontSample = function(font, size) {
    FontSettings.getInstance().setUpFontSample_($('sans-serif-font-sample'),
                                                size, font, true);
  };

  FontSettings.setUpFixedFontSample = function(font, size) {
    FontSettings.getInstance().setUpFontSample_($('fixed-font-sample'),
                                                size, font, false);
  };

  FontSettings.setUpMinimumFontSample = function(size) {
    // If size is less than 6, represent it as six in the sample to account
    // for the minimum logical font size.
    if (size < 6)
      size = 6;
    FontSettings.getInstance().setUpFontSample_($('minimum-font-sample'), size,
                                                null, true);
  };

  /**
   * @param {boolean} available Whether the Advanced Font Settings Extension
   *     is installed and enabled.
   */
  FontSettings.notifyAdvancedFontSettingsAvailability = function(available) {
    $('advanced-font-settings-install').hidden = available;
    $('advanced-font-settings-options').hidden = !available;
  };

  // Export
  return {
    FontSettings: FontSettings
  };
});


// Copyright 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  var Page = cr.ui.pageManager.Page;

  /**
   * GeolocationOptions class
   * Handles initialization of the geolocation options.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function GeolocationOptions() {
    Page.call(this, 'geolocationOptions',
              loadTimeData.getString('geolocationOptionsPageTabTitle'),
              'geolocationCheckbox');
  };

  cr.addSingletonGetter(GeolocationOptions);

  GeolocationOptions.prototype = {
    __proto__: Page.prototype
  };

  // TODO(robliao): Determine if a full unroll is necessary
  // (http://crbug.com/306613).
  GeolocationOptions.showGeolocationOption = function() {};

  return {
    GeolocationOptions: GeolocationOptions
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @typedef {{
 *     default_handler: number,
 *     handlers: Array,
 *     has_policy_recommendations: boolean,
 *     is_default_handler_set_by_user: boolean,
 *     protocol: string
 * }}
 * @see chrome/browser/ui/webui/options/handler_options_handler.cc
 */
var Handlers;

cr.define('options', function() {
  /** @const */ var Page = cr.ui.pageManager.Page;
  /** @const */ var PageManager = cr.ui.pageManager.PageManager;

  /////////////////////////////////////////////////////////////////////////////
  // HandlerOptions class:

  /**
   * Encapsulated handling of handler options page.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function HandlerOptions() {
    this.activeNavTab = null;
    Page.call(this,
              'handlers',
              loadTimeData.getString('handlersPageTabTitle'),
              'handler-options');
  }

  cr.addSingletonGetter(HandlerOptions);

  HandlerOptions.prototype = {
    __proto__: Page.prototype,

    /**
     * The handlers list.
     * @type {options.HandlersList}
     * @private
     */
    handlersList_: null,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      this.createHandlersList_();

      $('handler-options-overlay-confirm').onclick =
          PageManager.closeOverlay.bind(PageManager);
    },

    /**
     * Creates, decorates and initializes the handlers list.
     * @private
     */
    createHandlersList_: function() {
      var handlersList = $('handlers-list');
      options.HandlersList.decorate(handlersList);
      this.handlersList_ = assertInstanceof(handlersList, options.HandlersList);
      this.handlersList_.autoExpands = true;

      var ignoredHandlersList = $('ignored-handlers-list');
      options.IgnoredHandlersList.decorate(ignoredHandlersList);
      this.ignoredHandlersList_ = assertInstanceof(ignoredHandlersList,
          options.IgnoredHandlersList);
      this.ignoredHandlersList_.autoExpands = true;
    },
  };

  /**
   * Sets the list of handlers shown by the view.
   * @param {Array<Handlers>} handlers Handlers to be shown in the view.
   */
  HandlerOptions.setHandlers = function(handlers) {
    $('handlers-list').setHandlers(handlers);
  };

  /**
   * Sets the list of ignored handlers shown by the view.
   * @param {Array} handlers Handlers to be shown in the view.
   */
  HandlerOptions.setIgnoredHandlers = function(handlers) {
    $('ignored-handlers-section').hidden = handlers.length == 0;
    $('ignored-handlers-list').setHandlers(handlers);
  };

  return {
    HandlerOptions: HandlerOptions
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /** @const */ var ArrayDataModel = cr.ui.ArrayDataModel;
  /** @const */ var List = cr.ui.List;
  /** @const */ var ListItem = cr.ui.ListItem;
  /** @const */ var DeletableItem = options.DeletableItem;
  /** @const */ var DeletableItemList = options.DeletableItemList;

  /**
   * Creates a new ignored protocol / content handler list item.
   *
   * Accepts values in the form
   *   ['mailto', 'http://www.thesite.com/%s', 'www.thesite.com'],
   * @param {Object} entry A dictionary describing the handlers for a given
   *     protocol.
   * @constructor
   * @extends {options.DeletableItem}
   */
  function IgnoredHandlersListItem(entry) {
    var el = cr.doc.createElement('div');
    el.dataItem = entry;
    el.__proto__ = IgnoredHandlersListItem.prototype;
    el.decorate();
    return el;
  }

  IgnoredHandlersListItem.prototype = {
    __proto__: DeletableItem.prototype,

    /** @override */
    decorate: function() {
      DeletableItem.prototype.decorate.call(this);

      // Protocol.
      var protocolElement = document.createElement('div');
      protocolElement.textContent = this.dataItem[0];
      protocolElement.className = 'handlers-type-column';
      this.contentElement_.appendChild(protocolElement);

      // Host name.
      var hostElement = document.createElement('div');
      hostElement.textContent = this.dataItem[2];
      hostElement.className = 'handlers-site-column';
      hostElement.title = this.dataItem[1];
      this.contentElement_.appendChild(hostElement);
    },
  };

  /**
   * @constructor
   * @extends {options.DeletableItemList}
   */
  var IgnoredHandlersList = cr.ui.define('list');

  IgnoredHandlersList.prototype = {
    __proto__: DeletableItemList.prototype,

    /**
     * @override
     * @param {Object} entry
     */
    createItem: function(entry) {
      return new IgnoredHandlersListItem(entry);
    },

    deleteItemAtIndex: function(index) {
      chrome.send('removeIgnoredHandler', [this.dataModel.item(index)]);
    },

    /**
     * The length of the list.
     */
    get length() {
      return this.dataModel.length;
    },

    /**
     * Set the protocol handlers displayed by this list.  See
     * IgnoredHandlersListItem for an example of the format the list should
     * take.
     *
     * @param {!Array} list A list of ignored protocol handlers.
     */
    setHandlers: function(list) {
      this.dataModel = new ArrayDataModel(list);
    },
  };

  /**
   * Creates a new protocol / content handler list item.
   *
   * Accepts values in the form
   * { protocol: 'mailto',
   *   handlers: [
   *     ['mailto', 'http://www.thesite.com/%s', 'www.thesite.com'],
   *     ...,
   *   ],
   * }
   * @param {Object} entry A dictionary describing the handlers for a given
   *     protocol.
   * @constructor
   * @extends {cr.ui.ListItem}
   */
  function HandlerListItem(entry) {
    var el = cr.doc.createElement('div');
    el.dataItem = entry;
    el.__proto__ = HandlerListItem.prototype;
    el.decorate();
    return el;
  }

  HandlerListItem.prototype = {
    __proto__: ListItem.prototype,

    /**
     * @param {Handlers} data
     * @param {{removeHandler: Function, setDefault: Function,
     *          clearDefault: Function}} delegate
     */
    buildWidget_: function(data, delegate) {
      // Protocol.
      var protocolElement = document.createElement('div');
      protocolElement.textContent = data.protocol;
      protocolElement.className = 'handlers-type-column';
      this.appendChild(protocolElement);

      // Handler selection.
      var handlerElement = document.createElement('div');
      var selectElement = document.createElement('select');
      var defaultOptionElement = document.createElement('option');
      defaultOptionElement.selected = data.default_handler == -1;
      defaultOptionElement.textContent =
          loadTimeData.getString('handlersNoneHandler');
      defaultOptionElement.value = -1;
      selectElement.appendChild(defaultOptionElement);

      for (var i = 0; i < data.handlers.length; ++i) {
        var optionElement = document.createElement('option');
        optionElement.selected = i == data.default_handler;
        optionElement.textContent = data.handlers[i][2];
        optionElement.value = i;
        selectElement.appendChild(optionElement);
      }

      selectElement.addEventListener('change', function(e) {
        var index = e.target.value;
        if (index == -1) {
          this.classList.add('none');
          delegate.clearDefault(data.protocol);
        } else {
          handlerElement.classList.remove('none');
          delegate.setDefault(data.handlers[index]);
        }
      });
      handlerElement.appendChild(selectElement);
      handlerElement.className = 'handlers-site-column';
      if (data.default_handler == -1)
        this.classList.add('none');
      this.appendChild(handlerElement);

      if (data.has_policy_recommendations) {
        // Create an indicator to show that the handler has policy
        // recommendations.
        var indicator = new options.ControlledSettingIndicator();
        if (data.is_default_handler_set_by_user || data.default_handler == -1) {
          // The default handler is registered by the user or set to none, which
          // indicates that the user setting has overridden a policy
          // recommendation. Show the appropriate bubble.
          indicator.controlledBy = 'hasRecommendation';
          indicator.resetHandler = function() {
            // If there is a policy recommendation, data.handlers.length >= 1.
            // Setting the default handler to 0 ensures that it won't be 'none',
            // and there *is* a user registered handler created by setDefault,
            // which is required for a change notification.
            // The user-registered handlers are removed in a loop. Note that if
            // a handler is installed by policy, removeHandler does nothing.
            delegate.setDefault(data.handlers[0]);
            for (var i = 0; i < data.handlers.length; ++i) {
              delegate.removeHandler(i, data.handlers[i]);
            }
          };
        } else {
          indicator.controlledBy = 'recommended';
        }
        this.appendChild(indicator);
      }

      if (data.is_default_handler_set_by_user) {
        // Remove link.
        var removeElement = document.createElement('div');
        removeElement.textContent =
            loadTimeData.getString('handlersRemoveLink');
        removeElement.addEventListener('click', function(e) {
          var value = selectElement ? selectElement.value : 0;
          delegate.removeHandler(value, data.handlers[value]);
        });
        removeElement.className =
            'handlers-remove-column handlers-remove-link';
        this.appendChild(removeElement);
      }
    },

    /** @override */
    decorate: function() {
      ListItem.prototype.decorate.call(this);

      var delegate = {
        removeHandler: function(index, handler) {
          chrome.send('removeHandler', [handler]);
        },
        setDefault: function(handler) {
          chrome.send('setDefault', [handler]);
        },
        clearDefault: function(protocol) {
          chrome.send('clearDefault', [protocol]);
        },
      };

      this.buildWidget_(this.dataItem, delegate);
    },
  };

  /**
   * Create a new passwords list.
   * @constructor
   * @extends {cr.ui.List}
   */
  var HandlersList = cr.ui.define('list');

  HandlersList.prototype = {
    __proto__: List.prototype,

    /**
     * @override
     * @param {Object} entry
     */
    createItem: function(entry) {
      return new HandlerListItem(entry);
    },

    /**
     * The length of the list.
     */
    get length() {
      return this.dataModel.length;
    },

    /**
     * Set the protocol handlers displayed by this list.
     * See HandlerListItem for an example of the format the list should take.
     *
     * @param {!Array} list A list of protocols with their registered handlers.
     */
    setHandlers: function(list) {
      this.dataModel = new ArrayDataModel(list);
    },
  };

  return {
    IgnoredHandlersListItem: IgnoredHandlersListItem,
    IgnoredHandlersList: IgnoredHandlersList,
    HandlerListItem: HandlerListItem,
    HandlersList: HandlersList,
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /** @const */ var Page = cr.ui.pageManager.Page;
  /** @const */ var SettingsDialog = options.SettingsDialog;

  /**
   * HomePageOverlay class
   * Dialog that allows users to set the home page.
   * @constructor
   * @extends {options.SettingsDialog}
   */
  function HomePageOverlay() {
    SettingsDialog.call(this, 'homePageOverlay',
        loadTimeData.getString('homePageOverlayTabTitle'),
        'home-page-overlay',
        assertInstanceof($('home-page-confirm'), HTMLButtonElement),
        assertInstanceof($('home-page-cancel'), HTMLButtonElement));
  }

  cr.addSingletonGetter(HomePageOverlay);

  HomePageOverlay.prototype = {
    __proto__: SettingsDialog.prototype,

    /**
     * An autocomplete list that can be attached to the home page URL field.
     * @type {cr.ui.AutocompleteList}
     * @private
     */
    autocompleteList_: null,

    /** @override */
    initializePage: function() {
      SettingsDialog.prototype.initializePage.call(this);

      var self = this;
      options.Preferences.getInstance().addEventListener(
          'homepage_is_newtabpage',
          this.handleHomepageIsNTPPrefChange.bind(this));

      var urlField = $('homepage-url-field');
      urlField.addEventListener('keydown', function(event) {
        // Don't auto-submit when the user selects something from the
        // auto-complete list.
        if (event.keyIdentifier == 'Enter' && !self.autocompleteList_.hidden)
          event.stopPropagation();
      });
      urlField.addEventListener('change', this.updateFavicon_.bind(this));

      var suggestionList = new cr.ui.AutocompleteList();
      suggestionList.autoExpands = true;
      suggestionList.requestSuggestions =
          this.requestAutocompleteSuggestions_.bind(this);
      $('home-page-overlay').appendChild(suggestionList);
      this.autocompleteList_ = suggestionList;

      urlField.addEventListener('focus', function(event) {
        self.autocompleteList_.attachToInput(urlField);
      });
      urlField.addEventListener('blur', function(event) {
        self.autocompleteList_.detach();
      });
    },

    /** @override */
    didShowPage: function() {
      this.updateFavicon_();
    },

    /**
     * Updates the state of the homepage text input and its controlled setting
     * indicator when the |homepage_is_newtabpage| pref changes. The input is
     * enabled only if the homepage is not the NTP. The indicator is always
     * enabled but treats the input's value as read-only if the homepage is the
     * NTP.
     * @param {Event} event Pref change event.
     */
    handleHomepageIsNTPPrefChange: function(event) {
      var urlField = $('homepage-url-field');
      var urlFieldIndicator = $('homepage-url-field-indicator');
      urlField.setDisabled('homepage-is-ntp', event.value.value);
      urlFieldIndicator.readOnly = event.value.value;
    },

    /**
     * Updates the background of the url field to show the favicon for the
     * URL that is currently typed in.
     * @private
     */
    updateFavicon_: function() {
      var urlField = $('homepage-url-field');
      urlField.style.backgroundImage = getFaviconImageSet(urlField.value);
    },

    /**
     * Sends an asynchronous request for new autocompletion suggestions for the
     * the given query. When new suggestions are available, the C++ handler will
     * call updateAutocompleteSuggestions_.
     * @param {string} query List of autocomplete suggestions.
     * @private
     */
    requestAutocompleteSuggestions_: function(query) {
      chrome.send('requestAutocompleteSuggestionsForHomePage', [query]);
    },

    /**
     * Updates the autocomplete suggestion list with the given entries.
     * @param {Array} suggestions List of autocomplete suggestions.
     * @private
     */
    updateAutocompleteSuggestions_: function(suggestions) {
      var list = this.autocompleteList_;
      // If the trigger for this update was a value being selected from the
      // current list, do nothing.
      if (list.targetInput && list.selectedItem &&
          list.selectedItem.url == list.targetInput.value) {
        return;
      }
      list.suggestions = suggestions;
    },

    /**
     * Sets the 'show home button' and 'home page is new tab page' preferences.
     * (The home page url preference is set automatically by the SettingsDialog
     * code.)
     */
    handleConfirm: function() {
      // Strip whitespace.
      var urlField = $('homepage-url-field');
      var homePageValue = urlField.value.replace(/\s*/g, '');
      urlField.value = homePageValue;

      // Don't save an empty URL for the home page. If the user left the field
      // empty, switch to the New Tab page.
      if (!homePageValue)
        $('homepage-use-ntp').checked = true;

      SettingsDialog.prototype.handleConfirm.call(this);
    },
  };

  HomePageOverlay.updateAutocompleteSuggestions = function() {
    var instance = HomePageOverlay.getInstance();
    instance.updateAutocompleteSuggestions_.apply(instance, arguments);
  };

  // Export
  return {
    HomePageOverlay: HomePageOverlay
  };
});

// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /** @const */ var ConfirmDialog = options.ConfirmDialog;
  /** @const */ var SettingsDialog = options.SettingsDialog;
  /** @const */ var PageManager = cr.ui.pageManager.PageManager;

  /**
   * A dialog that will pop up when the user attempts to set the value of the
   * Boolean |pref| to |true|, asking for confirmation. It will first check for
   * any errors and if any exist, not display the dialog but toggle the
   * indicator. Like its superclass, if the user clicks OK, the new value is
   * committed to Chrome. If the user clicks Cancel or leaves the settings page,
   * the new value is discarded.
   * @constructor
   * @extends {options.ConfirmDialog}
   */
  function HotwordConfirmDialog() {
    ConfirmDialog.call(this,
        'hotwordConfim',  // name
        loadTimeData.getString('hotwordConfirmOverlayTabTitle'),
        'hotword-confirm-overlay',  // pageDivName
        assertInstanceof($('hotword-confirm-ok'), HTMLButtonElement),
        assertInstanceof($('hotword-confirm-cancel'), HTMLButtonElement),
        $('hotword-search-enable')['pref'], // pref
        $('hotword-search-enable')['metric']); // metric

    this.indicator = $('hotword-search-setting-indicator');
  }

  HotwordConfirmDialog.prototype = {
    // TODO(dbeam): this class should probably derive SettingsDialog again as it
    // evily duplicates much of ConfirmDialog's functionality, calls methods
    // on SettingsDialog.prototype, and shadows private method names.
    __proto__: ConfirmDialog.prototype,

    /**
     * Handle changes to |pref|. Only uncommitted changes are relevant as these
     * originate from user and need to be explicitly committed to take effect.
     * Pop up the dialog if there are no errors from the indicator or commit the
     * change, depending on whether confirmation is needed.
     * @param {Event} event Change event.
     * @private
     */
    onPrefChanged_: function(event) {
      if (!event.value.uncommitted)
        return;

      if (event.value.value && !this.confirmed_) {
        // If there is an error, show the indicator icon with more information.
        if (this.indicator.errorText)
          this.indicator.updateBasedOnError();

        // Show confirmation dialog (regardless of whether there is an error).
        PageManager.showPageByName(this.name, false);
      } else {
        Preferences.getInstance().commitPref(this.pref, this.metric);
      }
    },

    /**
     * Override the initializePage function so that an updated version of
     * onPrefChanged_ can be used.
     * @override
     */
    initializePage: function() {
      SettingsDialog.prototype.initializePage.call(this);

      this.okButton.onclick = this.handleConfirm.bind(this);
      this.cancelButton.onclick = this.handleCancel.bind(this);
      Preferences.getInstance().addEventListener(
          this.pref, this.onPrefChanged_.bind(this));
    }
  };

  return {
    HotwordConfirmDialog: HotwordConfirmDialog
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  var Page = cr.ui.pageManager.Page;
  var PageManager = cr.ui.pageManager.PageManager;

  /**
   * ImportDataOverlay class
   * Encapsulated handling of the 'Import Data' overlay page.
   * @class
   */
  function ImportDataOverlay() {
    Page.call(this,
              'importData',
              loadTimeData.getString('importDataOverlayTabTitle'),
              'import-data-overlay');
  }

  cr.addSingletonGetter(ImportDataOverlay);

  /**
  * @param {string} type The type of data to import. Used in the element's ID.
  */
  function importable(type) {
    var id = 'import-' + type;
    return $(id).checked && !$(id + '-with-label').hidden;
  }

  ImportDataOverlay.prototype = {
    // Inherit from Page.
    __proto__: Page.prototype,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      var self = this;
      var checkboxes =
          document.querySelectorAll('#import-checkboxes input[type=checkbox]');
      for (var i = 0; i < checkboxes.length; i++) {
        checkboxes[i].customPrefChangeHandler = function(e) {
          options.PrefCheckbox.prototype.defaultPrefChangeHandler.call(this, e);
          self.validateCommitButton_();
          return true;
        };
      }

      $('import-browsers').onchange = function() {
        self.updateCheckboxes_();
        self.validateCommitButton_();
      };

      $('import-data-commit').onclick = function() {
        chrome.send('importData', [
            String($('import-browsers').selectedIndex),
            String($('import-history').checked),
            String($('import-favorites').checked),
            String($('import-passwords').checked),
            String($('import-search').checked),
            String($('import-autofill-form-data').checked)]);
      };

      $('import-data-cancel').onclick = function() {
        ImportDataOverlay.dismiss();
      };

      $('import-choose-file').onclick = function() {
        chrome.send('chooseBookmarksFile');
      };

      $('import-data-confirm').onclick = function() {
        ImportDataOverlay.dismiss();
      };

      // Form controls are disabled until the profile list has been loaded.
      self.setAllControlsEnabled_(false);
    },

    /**
     * Sets the enabled and checked state of the commit button.
     * @private
     */
    validateCommitButton_: function() {
      var somethingToImport =
          importable('history') || importable('favorites') ||
          importable('passwords') || importable('search') ||
          importable('autofill-form-data');
      $('import-data-commit').disabled = !somethingToImport;
      $('import-choose-file').disabled = !$('import-favorites').checked;
    },

    /**
     * Sets the enabled state of all the checkboxes and the commit button.
     * @private
     */
    setAllControlsEnabled_: function(enabled) {
      var checkboxes =
          document.querySelectorAll('#import-checkboxes input[type=checkbox]');
      for (var i = 0; i < checkboxes.length; i++)
        this.setUpCheckboxState_(checkboxes[i], enabled);
      $('import-data-commit').disabled = !enabled;
      $('import-choose-file').hidden = !enabled;
    },

    /**
     * Sets the enabled state of a checkbox element.
     * @param {Object} checkbox A checkbox element.
     * @param {boolean} enabled The enabled state of the checkbox. If false,
     *     the checkbox is disabled. If true, the checkbox is enabled.
     * @private
     */
    setUpCheckboxState_: function(checkbox, enabled) {
      checkbox.setDisabled('noProfileData', !enabled);
    },

    /**
     * Update the enabled and visible states of all the checkboxes.
     * @private
     */
    updateCheckboxes_: function() {
      var index = $('import-browsers').selectedIndex;
      var bookmarksFileSelected = index == this.browserProfiles.length - 1;
      $('import-choose-file').hidden = !bookmarksFileSelected;
      $('import-data-commit').hidden = bookmarksFileSelected;

      var browserProfile;
      if (this.browserProfiles.length > index)
        browserProfile = this.browserProfiles[index];
      var importOptions = ['history',
                           'favorites',
                           'passwords',
                           'search',
                           'autofill-form-data'];
      for (var i = 0; i < importOptions.length; i++) {
        var id = 'import-' + importOptions[i];
        var enable = browserProfile && browserProfile[importOptions[i]];
        this.setUpCheckboxState_($(id), enable);
        $(id + '-with-label').hidden = !enable;
      }
    },

    /**
     * Update the supported browsers popup with given entries.
     * @param {Array} browsers List of supported browsers name.
     * @private
     */
    updateSupportedBrowsers_: function(browsers) {
      this.browserProfiles = browsers;
      var browserSelect = $('import-browsers');
      browserSelect.remove(0);  // Remove the 'Loading...' option.
      browserSelect.textContent = '';
      var browserCount = browsers.length;

      if (browserCount == 0) {
        var option = new Option(loadTimeData.getString('noProfileFound'), 0);
        browserSelect.appendChild(option);

        this.setAllControlsEnabled_(false);
      } else {
        this.setAllControlsEnabled_(true);
        for (var i = 0; i < browserCount; i++) {
          var browser = browsers[i];
          var option = new Option(browser.name, browser.index);
          browserSelect.appendChild(option);
        }

        this.updateCheckboxes_();
        this.validateCommitButton_();
      }
    },

    /**
     * Clear import prefs set when user checks/unchecks a checkbox so that each
     * checkbox goes back to the default "checked" state (or alternatively, to
     * the state set by a recommended policy).
     * @private
     */
    clearUserPrefs_: function() {
      var importPrefs = ['import_history',
                         'import_bookmarks',
                         'import_saved_passwords',
                         'import_search_engine',
                         'import_autofill_form_data'];
      for (var i = 0; i < importPrefs.length; i++)
        Preferences.clearPref(importPrefs[i], true);
    },

    /**
     * Update the dialog layout to reflect success state.
     * @param {boolean} success If true, show success dialog elements.
     * @private
     */
    updateSuccessState_: function(success) {
      var sections = document.querySelectorAll('.import-data-configure');
      for (var i = 0; i < sections.length; i++)
        sections[i].hidden = success;

      sections = document.querySelectorAll('.import-data-success');
      for (var i = 0; i < sections.length; i++)
        sections[i].hidden = !success;
    },
  };

  ImportDataOverlay.clearUserPrefs = function() {
    ImportDataOverlay.getInstance().clearUserPrefs_();
  };

  /**
   * Update the supported browsers popup with given entries.
   * @param {Array} browsers List of supported browsers name.
   */
  ImportDataOverlay.updateSupportedBrowsers = function(browsers) {
    ImportDataOverlay.getInstance().updateSupportedBrowsers_(browsers);
  };

  /**
   * Update the UI to reflect whether an import operation is in progress.
   * @param {boolean} importing True if an import operation is in progress.
   */
  ImportDataOverlay.setImportingState = function(importing) {
    var checkboxes =
        document.querySelectorAll('#import-checkboxes input[type=checkbox]');
    for (var i = 0; i < checkboxes.length; i++)
        checkboxes[i].setDisabled('Importing', importing);
    if (!importing)
      ImportDataOverlay.getInstance().updateCheckboxes_();
    $('import-browsers').disabled = importing;
    $('import-throbber').style.visibility = importing ? 'visible' : 'hidden';
    ImportDataOverlay.getInstance().validateCommitButton_();
  };

  /**
   * Remove the import overlay from display.
   */
  ImportDataOverlay.dismiss = function() {
    ImportDataOverlay.clearUserPrefs();
    PageManager.closeOverlay();
  };

  /**
   * Show a message confirming the success of the import operation.
   */
  ImportDataOverlay.confirmSuccess = function() {
    var showBookmarksMessage = $('import-favorites').checked;
    ImportDataOverlay.setImportingState(false);
    $('import-find-your-bookmarks').hidden = !showBookmarksMessage;
    ImportDataOverlay.getInstance().updateSuccessState_(true);
  };

  /**
   * Show the import data overlay.
   */
  ImportDataOverlay.show = function() {
    // Make sure that any previous import success message is hidden, and
    // we're showing the UI to import further data.
    ImportDataOverlay.getInstance().updateSuccessState_(false);
    ImportDataOverlay.getInstance().validateCommitButton_();

    PageManager.showPageByName('importData');
  };

  // Export
  return {
    ImportDataOverlay: ImportDataOverlay
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

///////////////////////////////////////////////////////////////////////////////
// AddLanguageOverlay class:

/**
 * @typedef {{
 *   code: string,
 *   displayName: string,
 *   textDirection: string,
 *   nativeDisplayName: string
 * }}
 */
options.LanguageData;

cr.define('options', function() {
  /** @const */ var Page = cr.ui.pageManager.Page;
  /** @const */ var PageManager = cr.ui.pageManager.PageManager;

  /**
   * Encapsulated handling of ChromeOS add language overlay page.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function AddLanguageOverlay() {
    Page.call(this, 'addLanguage',
              loadTimeData.getString('addButton'),
              'add-language-overlay-page');
  }

  cr.addSingletonGetter(AddLanguageOverlay);

  AddLanguageOverlay.prototype = {
    // Inherit AddLanguageOverlay from Page.
    __proto__: Page.prototype,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      // Set up the cancel button.
      $('add-language-overlay-cancel-button').onclick = function(e) {
        PageManager.closeOverlay();
      };

      // Create the language list with which users can add a language.
      var addLanguageList = $('add-language-overlay-language-list');

      /**
       * @type {!Array<!options.LanguageData>}
       * @see chrome/browser/ui/webui/options/language_options_handler.cc
       */
      var languageListData = /** @type {!Array<!options.LanguageData>} */(
          loadTimeData.getValue('languageList'));
      for (var i = 0; i < languageListData.length; i++) {
        var language = languageListData[i];
        var displayText = language.displayName;
        // If the native name is different, add it.
        if (language.displayName != language.nativeDisplayName)
          displayText += ' - ' + language.nativeDisplayName;

        var option = cr.doc.createElement('option');
        option.value = language.code;
        option.textContent = displayText;
        addLanguageList.appendChild(option);
      }
    },
  };

  return {
    AddLanguageOverlay: AddLanguageOverlay
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options.dictionary_words', function() {
  /** @const */ var InlineEditableItemList = options.InlineEditableItemList;
  /** @const */ var InlineEditableItem = options.InlineEditableItem;

  /**
   * Creates a new dictionary word list item.
   * @param {string} dictionaryWord The dictionary word.
   * @param {function(string)} addDictionaryWordCallback Callback for
   * adding a dictionary word.
   * @constructor
   * @extends {options.InlineEditableItem}
   */
  function DictionaryWordsListItem(dictionaryWord, addDictionaryWordCallback) {
    var el = cr.doc.createElement('div');
    el.dictionaryWord_ = dictionaryWord;
    el.addDictionaryWordCallback_ = addDictionaryWordCallback;
    DictionaryWordsListItem.decorate(el);
    return el;
  }

  /**
   * Decorates an HTML element as a dictionary word list item.
   * @param {HTMLElement} el The element to decorate.
   */
  DictionaryWordsListItem.decorate = function(el) {
    el.__proto__ = DictionaryWordsListItem.prototype;
    el.decorate();
  };

  DictionaryWordsListItem.prototype = {
    __proto__: InlineEditableItem.prototype,

    /** @override */
    decorate: function() {
      InlineEditableItem.prototype.decorate.call(this);
      if (this.dictionaryWord_ == '')
        this.isPlaceholder = true;
      else
        this.editable = false;

      var wordEl = this.createEditableTextCell(this.dictionaryWord_);
      wordEl.classList.add('weakrtl');
      wordEl.classList.add('language-dictionary-overlay-word-list-item');
      this.contentElement.appendChild(wordEl);

      var wordField = wordEl.querySelector('input');
      wordField.classList.add('language-dictionary-overlay-word-list-item');
      if (this.isPlaceholder) {
        wordField.placeholder =
            loadTimeData.getString('languageDictionaryOverlayAddWordLabel');
      }

      this.addEventListener('commitedit', this.onEditCommitted_.bind(this));
    },

    /** @override */
    get hasBeenEdited() {
      return this.querySelector('input').value.length > 0;
    },

    /** @override */
    updateLeadState: function() {
      InlineEditableItem.prototype.updateLeadState.call(this);

      // Allow focusing the list item itself if not editable.
      if (!this.editable)
        this.tabIndex = this.lead ? 0 : -1;
    },

    /** @override */
    updateEditState: function() {
      InlineEditableItem.prototype.updateEditState.call(this);

      // Focus the list item itself if not editable.
      if (!this.editable && this.selected && this.lead)
        this.focus();
    },

    /**
     * Adds a word to the dictionary.
     * @param {Event} e Edit committed event.
     * @private
     */
    onEditCommitted_: function(e) {
      var input = e.currentTarget.querySelector('input');
      this.addDictionaryWordCallback_(input.value);
      input.value = '';
    },
  };

  /**
   * A list of words in the dictionary.
   * @constructor
   * @extends {options.InlineEditableItemList}
   */
  var DictionaryWordsList = cr.ui.define('list');

  DictionaryWordsList.prototype = {
    __proto__: InlineEditableItemList.prototype,

    /**
     * The function to notify that the word list has changed.
     * @type {?Function}
     */
    onWordListChanged: null,

    /**
     * The list of all words in the dictionary. Used to generate a filtered word
     * list in the |search(searchTerm)| method.
     * @type {Array}
     * @private
     */
    allWordsList_: null,

    /**
     * The list of words that the user removed, but |DictionaryWordList| has not
     * received a notification of their removal yet.
     * @type {Array}
     * @private
     */
    removedWordsList_: [],

    /**
     * Adds a dictionary word.
     * @param {string} dictionaryWord The word to add.
     * @private
     */
    addDictionaryWord_: function(dictionaryWord) {
      this.allWordsList_.push(dictionaryWord);
      this.dataModel.splice(this.dataModel.length - 1, 0, dictionaryWord);
      this.onWordListChanged();
      chrome.send('addDictionaryWord', [dictionaryWord]);
    },

    /**
     * Searches the list for the matching words.
     * @param {string} searchTerm The search term.
     */
    search: function(searchTerm) {
      var filteredWordList = this.allWordsList_.filter(
          function(element, index, array) {
            return element.indexOf(searchTerm) > -1;
          });
      filteredWordList.push('');
      this.dataModel = new cr.ui.ArrayDataModel(filteredWordList);
      this.onWordListChanged();
    },

    /**
     * Sets the list of dictionary words.
     * @param {Array} entries The list of dictionary words.
     */
    setWordList: function(entries) {
      this.allWordsList_ = entries.slice(0);
      // Empty string is a placeholder for entering new words.
      entries.push('');
      this.dataModel = new cr.ui.ArrayDataModel(entries);
      this.onWordListChanged();
    },

    /**
     * Adds non-duplicate dictionary words.
     * @param {Array} entries The list of dictionary words.
     */
    addWords: function(entries) {
      var toAdd = [];
      for (var i = 0; i < entries.length; i++) {
        if (this.allWordsList_.indexOf(entries[i]) == -1) {
          this.allWordsList_.push(entries[i]);
          toAdd.push(entries[i]);
        }
      }
      if (toAdd.length == 0)
        return;
      for (var i = 0; i < toAdd.length; i++)
        this.dataModel.splice(this.dataModel.length - 1, 0, toAdd[i]);
      this.onWordListChanged();
    },

    /**
     * Removes dictionary words that are not in |removedWordsList_|. If a word
     * is in |removedWordsList_|, then removes the word from there instead.
     * @param {Array} entries The list of dictionary words.
     */
    removeWords: function(entries) {
      var index;
      var toRemove = [];
      for (var i = 0; i < entries.length; i++) {
        index = this.removedWordsList_.indexOf(entries[i]);
        if (index > -1) {
          this.removedWordsList_.splice(index, 1);
        } else {
          index = this.allWordsList_.indexOf(entries[i]);
          if (index > -1) {
            this.allWordsList_.splice(index, 1);
            toRemove.push(entries[i]);
          }
        }
      }
      if (toRemove.length == 0)
        return;
      for (var i = 0; i < toRemove.length; i++) {
        index = this.dataModel.indexOf(toRemove[i]);
        if (index > -1)
          this.dataModel.splice(index, 1);
      }
      this.onWordListChanged();
    },

    /**
     * Returns true if the data model contains no words, otherwise returns
     * false.
     * @type {boolean}
     */
    get empty() {
      // A data model without dictionary words contains one placeholder for
      // entering new words.
      return this.dataModel.length < 2;
    },

    /**
     * @override
     * @param {string} dictionaryWord
     */
    createItem: function(dictionaryWord) {
      return new DictionaryWordsListItem(
          dictionaryWord,
          this.addDictionaryWord_.bind(this));
    },

    /** @override */
    deleteItemAtIndex: function(index) {
      // The last element in the data model is an undeletable placeholder for
      // entering new words.
      assert(index > -1 && index < this.dataModel.length - 1);
      var item = this.dataModel.item(index);
      var allWordsListIndex = this.allWordsList_.indexOf(item);
      assert(allWordsListIndex > -1);
      this.allWordsList_.splice(allWordsListIndex, 1);
      this.dataModel.splice(index, 1);
      this.removedWordsList_.push(item);
      this.onWordListChanged();
      chrome.send('removeDictionaryWord', [item]);
    },

    /** @override */
    shouldFocusPlaceholderOnEditCommit: function() {
      return false;
    },

    /** @override */
    getInitialFocusableItem: function() {
      return /** @type {options.InlineEditableItem} */(
          this.getListItemByIndex(this.selectionModel.length - 1));
    },
  };

  return {
    DictionaryWordsList: DictionaryWordsList
  };

});


// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /** @const */ var DictionaryWordsList =
      options.dictionary_words.DictionaryWordsList;
  /** @const */ var Page = cr.ui.pageManager.Page;
  /** @const */ var PageManager = cr.ui.pageManager.PageManager;

  /**
   * Adding and removing words in custom spelling dictionary.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function EditDictionaryOverlay() {
    Page.call(this, 'editDictionary',
              loadTimeData.getString('languageDictionaryOverlayPage'),
              'language-dictionary-overlay-page');
  }

  cr.addSingletonGetter(EditDictionaryOverlay);

  EditDictionaryOverlay.prototype = {
    __proto__: Page.prototype,

    /**
     * A list of words in the dictionary.
     * @type {options.dictionary_words.DictionaryWordsList}
     * @private
     */
    wordList_: null,

    /**
     * The input field for searching for words in the dictionary.
     * @type {HTMLElement}
     * @private
     */
    searchField_: null,

    /**
     * The paragraph of text that indicates that search returned no results.
     * @type {HTMLElement}
     * @private
     */
    noMatchesLabel_: null,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      var wordList = $('language-dictionary-overlay-word-list');
      DictionaryWordsList.decorate(wordList);
      this.wordList_ = assertInstanceof(wordList, DictionaryWordsList);
      this.wordList_.onWordListChanged = function() {
        this.onWordListChanged_();
      }.bind(this);

      this.searchField_ = $('language-dictionary-overlay-search-field');
      this.searchField_.onsearch = function(e) {
        this.wordList_.search(e.currentTarget.value);
      }.bind(this);
      this.searchField_.onkeydown = function(e) {
        // Don't propagate enter key events. Otherwise the default button will
        // activate.
        if (e.keyIdentifier == 'Enter')
          e.stopPropagation();
      };

      this.noMatchesLabel_ = getRequiredElement(
          'language-dictionary-overlay-no-matches');

      $('language-dictionary-overlay-done-button').onclick = function(e) {
        PageManager.closeOverlay();
      };
    },

    /**
     * Refresh the dictionary words when the page is displayed.
     * @override
     */
    didShowPage: function() {
      chrome.send('refreshDictionaryWords');
    },

    /**
     * Update the view based on the changes in the word list.
     * @private
     */
    onWordListChanged_: function() {
      if (this.searchField_.value.length > 0 && this.wordList_.empty) {
        this.noMatchesLabel_.hidden = false;
        this.wordList_.classList.add('no-search-matches');
      } else {
        this.noMatchesLabel_.hidden = true;
        this.wordList_.classList.remove('no-search-matches');
      }
    },
  };

  EditDictionaryOverlay.setWordList = function(entries) {
    EditDictionaryOverlay.getInstance().wordList_.setWordList(entries);
  };

  EditDictionaryOverlay.updateWords = function(add_words, remove_words) {
    EditDictionaryOverlay.getInstance().wordList_.addWords(add_words);
    EditDictionaryOverlay.getInstance().wordList_.removeWords(remove_words);
  };

  EditDictionaryOverlay.getWordListForTesting = function() {
    return EditDictionaryOverlay.getInstance().wordList_;
  };

  return {
    EditDictionaryOverlay: EditDictionaryOverlay
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /** @const */ var ArrayDataModel = cr.ui.ArrayDataModel;
  /** @const */ var DeletableItem = options.DeletableItem;
  /** @const */ var DeletableItemList = options.DeletableItemList;
  /** @const */ var List = cr.ui.List;
  /** @const */ var ListItem = cr.ui.ListItem;
  /** @const */ var ListSingleSelectionModel = cr.ui.ListSingleSelectionModel;

  /**
   * Creates a new Language list item.
   * @param {Object} languageInfo The information of the language.
   * @constructor
   * @extends {options.DeletableItem}
   */
  function LanguageListItem(languageInfo) {
    var el = cr.doc.createElement('li');
    el.__proto__ = LanguageListItem.prototype;
    el.language_ = languageInfo;
    el.decorate();
    return el;
  };

  LanguageListItem.prototype = {
    __proto__: DeletableItem.prototype,

    /**
     * The language code of this language.
     * @type {?string}
     * @private
     */
    languageCode_: null,

    /** @override */
    decorate: function() {
      DeletableItem.prototype.decorate.call(this);

      var languageCode = this.language_.code;
      var languageOptions = options.LanguageOptions.getInstance();
      this.deletable = languageOptions.languageIsDeletable(languageCode);
      this.languageCode = languageCode;
      this.languageName = cr.doc.createElement('div');
      this.languageName.className = 'language-name';
      this.languageName.dir = this.language_.textDirection;
      this.languageName.textContent = this.language_.displayName;
      this.contentElement.appendChild(this.languageName);
      this.title = this.language_.nativeDisplayName;
      this.draggable = true;
    },
  };

  /**
   * Creates a new language list.
   * @param {Object=} opt_propertyBag Optional properties.
   * @constructor
   * @extends {options.DeletableItemList}
   */
  var LanguageList = cr.ui.define('list');

  /**
   * Gets information of a language from the given language code.
   * @param {string} languageCode Language code (ex. "fr").
   */
  LanguageList.getLanguageInfoFromLanguageCode = function(languageCode) {
    // Build the language code to language info dictionary at first time.
    if (!this.languageCodeToLanguageInfo_) {
      this.languageCodeToLanguageInfo_ = {};
      var languageList = loadTimeData.getValue('languageList');
      for (var i = 0; i < languageList.length; i++) {
        var languageInfo = languageList[i];
        this.languageCodeToLanguageInfo_[languageInfo.code] = languageInfo;
      }
    }

    return this.languageCodeToLanguageInfo_[languageCode];
  };

  /**
   * Returns true if the given language code is valid.
   * @param {string} languageCode Language code (ex. "fr").
   */
  LanguageList.isValidLanguageCode = function(languageCode) {
    // Having the display name for the language code means that the
    // language code is valid.
    if (LanguageList.getLanguageInfoFromLanguageCode(languageCode)) {
      return true;
    }
    return false;
  };

  LanguageList.prototype = {
    __proto__: DeletableItemList.prototype,

    // The list item being dragged.
    draggedItem: null,
    // The drop position information: "below" or "above".
    dropPos: null,
    // The preference is a CSV string that describes preferred languages
    // in Chrome OS. The language list is used for showing the language
    // list in "Language and Input" options page.
    preferredLanguagesPref: 'settings.language.preferred_languages',
    // The preference is a CSV string that describes accept languages used
    // for content negotiation. To be more precise, the list will be used
    // in "Accept-Language" header in HTTP requests.
    acceptLanguagesPref: 'intl.accept_languages',

    /** @override */
    decorate: function() {
      DeletableItemList.prototype.decorate.call(this);
      this.selectionModel = new ListSingleSelectionModel;

      // HACK(arv): http://crbug.com/40902
      window.addEventListener('resize', this.redraw.bind(this));

      // Listen to pref change.
      if (cr.isChromeOS) {
        Preferences.getInstance().addEventListener(this.preferredLanguagesPref,
            this.handlePreferredLanguagesPrefChange_.bind(this));
      } else {
        Preferences.getInstance().addEventListener(this.acceptLanguagesPref,
            this.handleAcceptLanguagesPrefChange_.bind(this));
      }

      // Listen to drag and drop events.
      this.addEventListener('dragstart', this.handleDragStart_.bind(this));
      this.addEventListener('dragenter', this.handleDragEnter_.bind(this));
      this.addEventListener('dragover', this.handleDragOver_.bind(this));
      this.addEventListener('drop', this.handleDrop_.bind(this));
      this.addEventListener('dragleave', this.handleDragLeave_.bind(this));
    },

    /**
     * @override
     * @param {string} languageCode
     */
    createItem: function(languageCode) {
      var languageInfo =
          LanguageList.getLanguageInfoFromLanguageCode(languageCode);
      return new LanguageListItem(languageInfo);
    },

    /*
     * For each item, determines whether it's deletable.
     */
    updateDeletable: function() {
      var items = this.items;
      for (var i = 0; i < items.length; ++i) {
        var item = items[i];
        var languageCode = item.languageCode;
        var languageOptions = options.LanguageOptions.getInstance();
        item.deletable = languageOptions.languageIsDeletable(languageCode);
      }
    },

    /**
     * Adds a language to the language list.
     * @param {string} languageCode language code (ex. "fr").
     */
    addLanguage: function(languageCode) {
      // It shouldn't happen but ignore the language code if it's
      // null/undefined, or already present.
      if (!languageCode || this.dataModel.indexOf(languageCode) >= 0) {
        return;
      }
      this.dataModel.push(languageCode);
      // Select the last item, which is the language added.
      this.selectionModel.selectedIndex = this.dataModel.length - 1;

      this.savePreference_();
    },

    /**
     * Gets the language codes of the currently listed languages.
     */
    getLanguageCodes: function() {
      return this.dataModel.slice();
    },

    /**
     * Clears the selection
     */
    clearSelection: function() {
      this.selectionModel.unselectAll();
    },

    /**
     * Gets the language code of the selected language.
     */
    getSelectedLanguageCode: function() {
      return this.selectedItem;
    },

    /**
     * Selects the language by the given language code.
     * @return {boolean} True if the operation is successful.
     */
    selectLanguageByCode: function(languageCode) {
      var index = this.dataModel.indexOf(languageCode);
      if (index >= 0) {
        this.selectionModel.selectedIndex = index;
        return true;
      }
      return false;
    },

    /** @override */
    deleteItemAtIndex: function(index) {
      if (index >= 0) {
        this.dataModel.splice(index, 1);
        // Once the selected item is removed, there will be no selected item.
        // Select the item pointed by the lead index.
        index = this.selectionModel.leadIndex;
        this.savePreference_();
      }
      return index;
    },

    /**
     * Computes the target item of drop event.
     * @param {Event} e The drop or dragover event.
     * @private
     */
    getTargetFromDropEvent_: function(e) {
      var target = e.target;
      // e.target may be an inner element of the list item
      while (target != null && !(target instanceof ListItem)) {
        target = target.parentNode;
      }
      return target;
    },

    /**
     * Handles the dragstart event.
     * @param {Event} e The dragstart event.
     * @private
     */
    handleDragStart_: function(e) {
      var target = e.target;
      // ListItem should be the only draggable element type in the page,
      // but just in case.
      if (target instanceof ListItem) {
        this.draggedItem = target;
        e.dataTransfer.effectAllowed = 'move';
        // We need to put some kind of data in the drag or it will be
        // ignored.  Use the display name in case the user drags to a text
        // field or the desktop.
        e.dataTransfer.setData('text/plain', target.title);
      }
    },

    /**
     * Handles the dragenter event.
     * @param {Event} e The dragenter event.
     * @private
     */
    handleDragEnter_: function(e) {
      e.preventDefault();
    },

    /**
     * Handles the dragover event.
     * @param {Event} e The dragover event.
     * @private
     */
    handleDragOver_: function(e) {
      var dropTarget = this.getTargetFromDropEvent_(e);
      // Determines whether the drop target is to accept the drop.
      // The drop is only successful on another ListItem.
      if (!(dropTarget instanceof ListItem) ||
          dropTarget == this.draggedItem) {
        this.hideDropMarker_();
        return;
      }
      // Compute the drop postion. Should we move the dragged item to
      // below or above the drop target?
      var rect = dropTarget.getBoundingClientRect();
      var dy = e.clientY - rect.top;
      var yRatio = dy / rect.height;
      var dropPos = yRatio <= .5 ? 'above' : 'below';
      this.dropPos = dropPos;
      this.showDropMarker_(dropTarget, dropPos);
      e.preventDefault();
    },

    /**
     * Handles the drop event.
     * @param {Event} e The drop event.
     * @private
     */
    handleDrop_: function(e) {
      var dropTarget = this.getTargetFromDropEvent_(e);
      this.hideDropMarker_();

      // Delete the language from the original position.
      var languageCode = this.draggedItem.languageCode;
      var originalIndex = this.dataModel.indexOf(languageCode);
      this.dataModel.splice(originalIndex, 1);
      // Insert the language to the new position.
      var newIndex = this.dataModel.indexOf(dropTarget.languageCode);
      if (this.dropPos == 'below')
        newIndex += 1;
      this.dataModel.splice(newIndex, 0, languageCode);
      // The cursor should move to the moved item.
      this.selectionModel.selectedIndex = newIndex;
      // Save the preference.
      this.savePreference_();
    },

    /**
     * Handles the dragleave event.
     * @param {Event} e The dragleave event
     * @private
     */
    handleDragLeave_: function(e) {
      this.hideDropMarker_();
    },

    /**
     * Shows and positions the marker to indicate the drop target.
     * @param {HTMLElement} target The current target list item of drop
     * @param {string} pos 'below' or 'above'
     * @private
     */
    showDropMarker_: function(target, pos) {
      window.clearTimeout(this.hideDropMarkerTimer_);
      var marker = $('language-options-list-dropmarker');
      var rect = target.getBoundingClientRect();
      var markerHeight = 8;
      if (pos == 'above') {
        marker.style.top = (rect.top - markerHeight / 2) + 'px';
      } else {
        marker.style.top = (rect.bottom - markerHeight / 2) + 'px';
      }
      marker.style.width = rect.width + 'px';
      marker.style.left = rect.left + 'px';
      marker.style.display = 'block';
    },

    /**
     * Hides the drop marker.
     * @private
     */
    hideDropMarker_: function() {
      // Hide the marker in a timeout to reduce flickering as we move between
      // valid drop targets.
      window.clearTimeout(this.hideDropMarkerTimer_);
      this.hideDropMarkerTimer_ = window.setTimeout(function() {
        $('language-options-list-dropmarker').style.display = '';
      }, 100);
    },

    /**
     * Handles preferred languages pref change.
     * @param {Event} e The change event object.
     * @private
     */
    handlePreferredLanguagesPrefChange_: function(e) {
      var languageCodesInCsv = e.value.value;
      var languageCodes = languageCodesInCsv.split(',');

      // Add the UI language to the initial list of languages.  This is to avoid
      // a bug where the UI language would be removed from the preferred
      // language list by sync on first login.
      // See: crosbug.com/14283
      languageCodes.push(navigator.language);
      languageCodes = this.filterBadLanguageCodes_(languageCodes);
      this.load_(languageCodes);
    },

    /**
     * Handles accept languages pref change.
     * @param {Event} e The change event object.
     * @private
     */
    handleAcceptLanguagesPrefChange_: function(e) {
      var languageCodesInCsv = e.value.value;
      var languageCodes = this.filterBadLanguageCodes_(
          languageCodesInCsv.split(','));
      this.load_(languageCodes);
    },

    /**
     * Loads given language list.
     * @param {!Array} languageCodes List of language codes.
     * @private
     */
    load_: function(languageCodes) {
      // Preserve the original selected index. See comments below.
      var originalSelectedIndex = (this.selectionModel ?
                                   this.selectionModel.selectedIndex : -1);
      this.dataModel = new ArrayDataModel(languageCodes);
      if (originalSelectedIndex >= 0 &&
          originalSelectedIndex < this.dataModel.length) {
        // Restore the original selected index if the selected index is
        // valid after the data model is loaded. This is neeeded to keep
        // the selected language after the languge is added or removed.
        this.selectionModel.selectedIndex = originalSelectedIndex;
        // The lead index should be updated too.
        this.selectionModel.leadIndex = originalSelectedIndex;
      } else if (this.dataModel.length > 0) {
        // Otherwise, select the first item if it's not empty.
        // Note that ListSingleSelectionModel won't select an item
        // automatically, hence we manually select the first item here.
        this.selectionModel.selectedIndex = 0;
      }
    },

    /**
     * Saves the preference.
     */
    savePreference_: function() {
      chrome.send('updateLanguageList', [this.dataModel.slice()]);
      cr.dispatchSimpleEvent(this, 'save');
    },

    /**
     * Filters bad language codes in case bad language codes are
     * stored in the preference. Removes duplicates as well.
     * @param {Array} languageCodes List of language codes.
     * @private
     */
    filterBadLanguageCodes_: function(languageCodes) {
      var filteredLanguageCodes = [];
      var seen = {};
      for (var i = 0; i < languageCodes.length; i++) {
        // Check if the the language code is valid, and not
        // duplicate. Otherwise, skip it.
        if (LanguageList.isValidLanguageCode(languageCodes[i]) &&
            !(languageCodes[i] in seen)) {
          filteredLanguageCodes.push(languageCodes[i]);
          seen[languageCodes[i]] = true;
        }
      }
      return filteredLanguageCodes;
    },
  };

  return {
    LanguageList: LanguageList,
    LanguageListItem: LanguageListItem
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// TODO(kochi): Generalize the notification as a component and put it
// in js/cr/ui/notification.js .

cr.define('options', function() {
  /** @const */ var Page = cr.ui.pageManager.Page;
  /** @const */ var PageManager = cr.ui.pageManager.PageManager;
  /** @const */ var LanguageList = options.LanguageList;
  /** @const */ var ThirdPartyImeConfirmOverlay =
      options.ThirdPartyImeConfirmOverlay;

  /**
   * Spell check dictionary download status.
   * @type {Enum}
   */
  /** @const*/ var DOWNLOAD_STATUS = {
    IN_PROGRESS: 1,
    FAILED: 2
  };

  /**
   * The preference is a boolean that enables/disables spell checking.
   * @type {string}
   * @const
   */
  var ENABLE_SPELL_CHECK_PREF = 'browser.enable_spellchecking';

  /**
   * The preference is a CSV string that describes preload engines
   * (i.e. active input methods).
   * @type {string}
   * @const
   */
  var PRELOAD_ENGINES_PREF = 'settings.language.preload_engines';

  /**
   * The preference that lists the extension IMEs that are enabled in the
   * language menu.
   * @type {string}
   * @const
   */
  var ENABLED_EXTENSION_IME_PREF = 'settings.language.enabled_extension_imes';

  /**
   * The preference that lists the languages which are not translated.
   * @type {string}
   * @const
   */
  var TRANSLATE_BLOCKED_LANGUAGES_PREF = 'translate_blocked_languages';

  /**
   * The preference key that is a list of strings that describes the spellcheck
   * dictionary language, like ["en-US", "fr"].
   * @type {string}
   * @const
   */
  var SPELL_CHECK_DICTIONARIES_PREF = 'spellcheck.dictionaries';

  /**
   * The preference that indicates if the Translate feature is enabled.
   * @type {string}
   * @const
   */
  var ENABLE_TRANSLATE = 'translate.enabled';

  /**
   * The preference is a boolean that activates/deactivates IME menu on shelf.
   * @type {string}
   * @const
   */
  var ACTIVATE_IME_MENU_PREF = 'settings.language.ime_menu_activated';

  /////////////////////////////////////////////////////////////////////////////
  // LanguageOptions class:

  /**
   * Encapsulated handling of ChromeOS language options page.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function LanguageOptions(model) {
    Page.call(this, 'languages',
              loadTimeData.getString('languagePageTabTitle'), 'languagePage');
  }

  cr.addSingletonGetter(LanguageOptions);

  // Inherit LanguageOptions from Page.
  LanguageOptions.prototype = {
    __proto__: Page.prototype,

    /**
     * For recording the prospective language (the next locale after relaunch).
     * @type {?string}
     * @private
     */
    prospectiveUiLanguageCode_: null,

    /**
     * Map from language code to spell check dictionary download status for that
     * language.
     * @type {Array}
     * @private
     */
    spellcheckDictionaryDownloadStatus_: [],

    /**
     * Number of times a spell check dictionary download failed.
     * @type {number}
     * @private
     */
    spellcheckDictionaryDownloadFailures_: 0,

    /**
     * The list of preload engines, like ['mozc', 'pinyin'].
     * @type {Array}
     * @private
     */
    preloadEngines_: [],

    /**
     * The list of extension IMEs that are enabled out of the language menu.
     * @type {Array}
     * @private
     */
    enabledExtensionImes_: [],

    /**
     * The list of the languages which is not translated.
     * @type {Array}
     * @private
     */
    translateBlockedLanguages_: [],

    /**
     * The list of the languages supported by Translate server
     * @type {Array}
     * @private
     */
    translateSupportedLanguages_: [],

    /**
     * The dictionary of currently selected spellcheck dictionary languages,
     * like {"en-US": true, "sl-SI": true}.
     * @type {!Object}
     * @private
     */
    spellCheckLanguages_: {},

    /**
     * The map of language code to input method IDs, like:
     * {'ja': ['mozc', 'mozc-jp'], 'zh-CN': ['pinyin'], ...}
     * @type {Object}
     * @private
     */
    languageCodeToInputMethodIdsMap_: {},

    /**
     * The value that indicates if Translate feature is enabled or not.
     * @type {boolean}
     * @private
     */
    enableTranslate_: false,

    /**
     * Returns true if the enable-multilingual-spellchecker flag is set.
     * @return {boolean}
     * @private
     */
    isMultilingualSpellcheckerEnabled_: function() {
      return loadTimeData.getBoolean('enableMultilingualSpellChecker');
    },

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      var languageOptionsList = $('language-options-list');
      LanguageList.decorate(languageOptionsList);

      languageOptionsList.addEventListener('change',
          this.handleLanguageOptionsListChange_.bind(this));
      languageOptionsList.addEventListener('save',
          this.handleLanguageOptionsListSave_.bind(this));

      this.prospectiveUiLanguageCode_ =
          loadTimeData.getString('prospectiveUiLanguageCode');
      this.addEventListener('visibleChange',
                            this.handleVisibleChange_.bind(this));

      if (cr.isChromeOS) {
        this.initializeInputMethodList_();
        this.initializeLanguageCodeToInputMethodIdsMap_();
      }

      var checkbox = $('offer-to-translate-in-this-language');
      checkbox.addEventListener('click',
          this.handleOfferToTranslateCheckboxClick_.bind(this));

      Preferences.getInstance().addEventListener(
          TRANSLATE_BLOCKED_LANGUAGES_PREF,
          this.handleTranslateBlockedLanguagesPrefChange_.bind(this));
      Preferences.getInstance().addEventListener(SPELL_CHECK_DICTIONARIES_PREF,
          this.handleSpellCheckDictionariesPrefChange_.bind(this));
      Preferences.getInstance().addEventListener(ENABLE_TRANSLATE,
          this.handleEnableTranslatePrefChange_.bind(this));
      this.translateSupportedLanguages_ = /** @type {Array} */(
          loadTimeData.getValue('translateSupportedLanguages'));

      // Set up add button.
      var onclick = function(e) {
        // Add the language without showing the overlay if it's specified in
        // the URL hash (ex. lang_add=ja).  Used for automated testing.
        var match = document.location.hash.match(/\blang_add=([\w-]+)/);
        if (match) {
          var addLanguageCode = match[1];
          $('language-options-list').addLanguage(addLanguageCode);
          this.addBlockedLanguage_(addLanguageCode);
        } else {
          PageManager.showPageByName('addLanguage');
          chrome.send('coreOptionsUserMetricsAction',
                      ['Options_Languages_Add']);
        }
      };
      $('language-options-add-button').onclick = onclick.bind(this);

      if (!cr.isMac) {
        // Set up the button for editing custom spelling dictionary.
        $('edit-custom-dictionary-button').onclick = function(e) {
          PageManager.showPageByName('editDictionary');
        };
        $('dictionary-download-retry-button').onclick = function(e) {
          chrome.send('retryDictionaryDownload',
                      [e.currentTarget.languageCode]);
        };
      }

      // Listen to add language dialog ok button.
      $('add-language-overlay-ok-button').addEventListener(
          'click', this.handleAddLanguageOkButtonClick_.bind(this));

      if (!(cr.isMac || cr.isChromeOS)) {
        // Handle spell check enable/disable.
        if (!this.isMultilingualSpellcheckerEnabled_()) {
          Preferences.getInstance().addEventListener(
              ENABLE_SPELL_CHECK_PREF, this.updateEnableSpellCheck_.bind(this));
        }
        $('enable-spellcheck-container').hidden =
            this.isMultilingualSpellcheckerEnabled_();
      }

      // Handle clicks on "Use this language for spell checking" button.
      if (!cr.isMac) {
        if (this.isMultilingualSpellcheckerEnabled_()) {
          $('spellcheck-language-checkbox').addEventListener(
              'change',
              this.handleSpellCheckLanguageCheckboxClick_.bind(this));
        } else {
          $('spellcheck-language-button').addEventListener(
              'click',
              this.handleSpellCheckLanguageButtonClick_.bind(this));
        }
      }

      if (cr.isChromeOS) {
        $('language-options-ui-restart-button').onclick = function() {
          chrome.send('uiLanguageRestart');
        };
      }

      $('language-confirm').onclick =
          PageManager.closeOverlay.bind(PageManager);

      // Public session users cannot change the locale.
      if (cr.isChromeOS && UIAccountTweaks.loggedInAsPublicAccount())
        $('language-options-ui-language-section').hidden = true;

      // IME menu (CrOS only).
      if (cr.isChromeOS) {
        // Show the 'activate-ime-menu' checkbox if the flag is tured on.
        if (loadTimeData.getBoolean('enableLanguageOptionsImeMenu'))
          $('language-options-ime-menu-template').hidden = false;

        // Listen to check on 'activate-ime-menu' checkbox.
        var checkboxImeMenu = $('activate-ime-menu');
        checkboxImeMenu.addEventListener('click',
            this.handleActivateImeMenuCheckboxClick_.bind(this));
      }
    },

    /**
     * Initializes the input method list.
     */
    initializeInputMethodList_: function() {
      var inputMethodList = $('language-options-input-method-list');
      var inputMethodPrototype = $('language-options-input-method-template');

      // Add all input methods, but make all of them invisible here. We'll
      // change the visibility in handleLanguageOptionsListChange_() based
      // on the selected language. Note that we only have less than 100
      // input methods, so creating DOM nodes at once here should be ok.
      this.appendInputMethodElement_(/** @type {!Array} */(
          loadTimeData.getValue('inputMethodList')));
      this.appendComponentExtensionIme_(/** @type {!Array} */(
          loadTimeData.getValue('componentExtensionImeList')));
      this.appendInputMethodElement_(/** @type {!Array} */(
          loadTimeData.getValue('extensionImeList')));

      // Listen to pref change once the input method list is initialized.
      Preferences.getInstance().addEventListener(
          PRELOAD_ENGINES_PREF,
          this.handlePreloadEnginesPrefChange_.bind(this));
      Preferences.getInstance().addEventListener(
          ENABLED_EXTENSION_IME_PREF,
          this.handleEnabledExtensionsPrefChange_.bind(this));
    },

    /**
     * Appends input method lists based on component extension ime list.
     * @param {!Array} componentExtensionImeList A list of input method
     *     descriptors.
     * @private
     */
    appendComponentExtensionIme_: function(componentExtensionImeList) {
      this.appendInputMethodElement_(componentExtensionImeList);

      for (var i = 0; i < componentExtensionImeList.length; i++) {
        var inputMethod = componentExtensionImeList[i];
        for (var languageCode in inputMethod.languageCodeSet) {
          if (languageCode in this.languageCodeToInputMethodIdsMap_) {
            this.languageCodeToInputMethodIdsMap_[languageCode].push(
                inputMethod.id);
          } else {
            this.languageCodeToInputMethodIdsMap_[languageCode] =
                [inputMethod.id];
          }
        }
      }
    },

    /**
     * Appends input methods into input method list.
     * @param {!Array} inputMethods A list of input method descriptors.
     * @private
     */
    appendInputMethodElement_: function(inputMethods) {
      var inputMethodList = $('language-options-input-method-list');
      var inputMethodTemplate = $('language-options-input-method-template');

      for (var i = 0; i < inputMethods.length; i++) {
        var inputMethod = inputMethods[i];
        var element = inputMethodTemplate.cloneNode(true);
        element.id = '';
        element.languageCodeSet = inputMethod.languageCodeSet;

        var input = element.querySelector('input');
        input.inputMethodId = inputMethod.id;
        input.imeProvider = inputMethod.extensionName;
        var span = element.querySelector('span');
        span.textContent = inputMethod.displayName;

        if (inputMethod.optionsPage) {
          var button = document.createElement('button');
          button.textContent = loadTimeData.getString('configure');
          button.inputMethodId = inputMethod.id;
          button.onclick = function(inputMethodId, e) {
            chrome.send('inputMethodOptionsOpen', [inputMethodId]);
          }.bind(this, inputMethod.id);
          element.appendChild(button);
        }

        // Listen to user clicks.
        input.addEventListener('click',
                               this.handleCheckboxClick_.bind(this));
        inputMethodList.appendChild(element);
      }
    },

    /**
     * Adds a language to the preference 'translate_blocked_languages'. If
     * |langCode| is already added, nothing happens. |langCode| is converted
     * to a Translate language synonym before added.
     * @param {string} langCode A language code like 'en'
     * @private
     */
    addBlockedLanguage_: function(langCode) {
      langCode = this.convertLangCodeForTranslation_(langCode);
      if (this.translateBlockedLanguages_.indexOf(langCode) == -1) {
        this.translateBlockedLanguages_.push(langCode);
        Preferences.setListPref(TRANSLATE_BLOCKED_LANGUAGES_PREF,
                                this.translateBlockedLanguages_, true);
      }
    },

    /**
     * Removes a language from the preference 'translate_blocked_languages'.
     * If |langCode| doesn't exist in the preference, nothing happens.
     * |langCode| is converted to a Translate language synonym before removed.
     * @param {string} langCode A language code like 'en'
     * @private
     */
    removeBlockedLanguage_: function(langCode) {
      langCode = this.convertLangCodeForTranslation_(langCode);
      if (this.translateBlockedLanguages_.indexOf(langCode) != -1) {
        this.translateBlockedLanguages_ =
            this.translateBlockedLanguages_.filter(
                function(langCodeNotTranslated) {
                  return langCodeNotTranslated != langCode;
                });
        Preferences.setListPref(TRANSLATE_BLOCKED_LANGUAGES_PREF,
                                this.translateBlockedLanguages_, true);
      }
    },

    /**
     * Handles Page's visible property change event.
     * @param {Event} e Property change event.
     * @private
     */
    handleVisibleChange_: function(e) {
      if (this.visible) {
        $('language-options-list').redraw();
        chrome.send('languageOptionsOpen');
      }
    },

    /**
     * Handles languageOptionsList's change event.
     * @param {Event} e Change event.
     * @private
     */
    handleLanguageOptionsListChange_: function(e) {
      var languageOptionsList = $('language-options-list');
      var languageCode = languageOptionsList.getSelectedLanguageCode();

      // If there's no selection, just return.
      if (!languageCode)
        return;

      // Select the language if it's specified in the URL hash (ex. lang=ja).
      // Used for automated testing.
      var match = document.location.hash.match(/\blang=([\w-]+)/);
      if (match) {
        var specifiedLanguageCode = match[1];
        if (languageOptionsList.selectLanguageByCode(specifiedLanguageCode)) {
          languageCode = specifiedLanguageCode;
        }
      }

      this.updateOfferToTranslateCheckbox_(languageCode);

      if (cr.isWindows || cr.isChromeOS)
        this.updateUiLanguageButton_(languageCode);

      this.updateSelectedLanguageName_(languageCode);

      if (!cr.isMac)
        this.updateSpellCheckLanguageControls_(languageCode);

      if (cr.isChromeOS)
        this.updateInputMethodList_(languageCode);

      this.updateLanguageListInAddLanguageOverlay_();
    },

    /**
     * Handles languageOptionsList's save event.
     * @param {Event} e Save event.
     * @private
     */
    handleLanguageOptionsListSave_: function(e) {
      if (cr.isChromeOS) {
        // Sort the preload engines per the saved languages before save.
        this.preloadEngines_ = this.sortPreloadEngines_(this.preloadEngines_);
        this.savePreloadEnginesPref_();
      }
    },

    /**
     * Sorts preloadEngines_ by languageOptionsList's order.
     * @param {Array} preloadEngines List of preload engines.
     * @return {Array} Returns sorted preloadEngines.
     * @private
     */
    sortPreloadEngines_: function(preloadEngines) {
      // For instance, suppose we have two languages and associated input
      // methods:
      //
      // - Korean: hangul
      // - Chinese: pinyin
      //
      // The preloadEngines preference should look like "hangul,pinyin".
      // If the user reverse the order, the preference should be reorderd
      // to "pinyin,hangul".
      var languageOptionsList = $('language-options-list');
      var languageCodes = languageOptionsList.getLanguageCodes();

      // Convert the list into a dictonary for simpler lookup.
      var preloadEngineSet = {};
      for (var i = 0; i < preloadEngines.length; i++) {
        preloadEngineSet[preloadEngines[i]] = true;
      }

      // Create the new preload engine list per the language codes.
      var newPreloadEngines = [];
      for (var i = 0; i < languageCodes.length; i++) {
        var languageCode = languageCodes[i];
        var inputMethodIds = this.languageCodeToInputMethodIdsMap_[
            languageCode];
        if (!inputMethodIds)
          continue;

        // Check if we have active input methods associated with the language.
        for (var j = 0; j < inputMethodIds.length; j++) {
          var inputMethodId = inputMethodIds[j];
          if (inputMethodId in preloadEngineSet) {
            // If we have, add it to the new engine list.
            newPreloadEngines.push(inputMethodId);
            // And delete it from the set. This is necessary as one input
            // method can be associated with more than one language thus
            // we should avoid having duplicates in the new list.
            delete preloadEngineSet[inputMethodId];
          }
        }
      }

      return newPreloadEngines;
    },

    /**
     * Initializes the map of language code to input method IDs.
     * @private
     */
    initializeLanguageCodeToInputMethodIdsMap_: function() {
      var inputMethodList = loadTimeData.getValue('inputMethodList');
      for (var i = 0; i < inputMethodList.length; i++) {
        var inputMethod = inputMethodList[i];
        for (var languageCode in inputMethod.languageCodeSet) {
          if (languageCode in this.languageCodeToInputMethodIdsMap_) {
            this.languageCodeToInputMethodIdsMap_[languageCode].push(
                inputMethod.id);
          } else {
            this.languageCodeToInputMethodIdsMap_[languageCode] =
                [inputMethod.id];
          }
        }
      }
    },

    /**
     * Updates the currently selected language name.
     * @param {string} languageCode Language code (ex. "fr").
     * @private
     */
    updateSelectedLanguageName_: function(languageCode) {
      var languageInfo = LanguageList.getLanguageInfoFromLanguageCode(
          languageCode);
      var languageDisplayName = languageInfo.displayName;
      var languageNativeDisplayName = languageInfo.nativeDisplayName;
      var textDirection = languageInfo.textDirection;

      // If the native name is different, add it.
      if (languageDisplayName != languageNativeDisplayName) {
        languageDisplayName += ' - ' + languageNativeDisplayName;
      }

      // Update the currently selected language name.
      var languageName = $('language-options-language-name');
      languageName.textContent = languageDisplayName;
      languageName.dir = textDirection;
    },

    /**
     * Updates the UI language button.
     * @param {string} languageCode Language code (ex. "fr").
     * @private
     */
    updateUiLanguageButton_: function(languageCode) {
      var uiLanguageButton = $('language-options-ui-language-button');
      var uiLanguageMessage = $('language-options-ui-language-message');
      var uiLanguageNotification = $('language-options-ui-notification-bar');

      // Remove the event listener and add it back if useful.
      uiLanguageButton.onclick = null;

      // Unhide the language button every time, as it could've been previously
      // hidden by a language change.
      uiLanguageButton.hidden = false;

      // Hide the controlled setting indicator.
      var uiLanguageIndicator = document.querySelector(
          '.language-options-contents .controlled-setting-indicator');
      uiLanguageIndicator.removeAttribute('controlled-by');

      if (languageCode == this.prospectiveUiLanguageCode_) {
        uiLanguageMessage.textContent =
            loadTimeData.getString('isDisplayedInThisLanguage');
        showMutuallyExclusiveNodes(
            [uiLanguageButton, uiLanguageMessage, uiLanguageNotification], 1);
      } else if (languageCode in loadTimeData.getValue('uiLanguageCodeSet')) {
        if (cr.isChromeOS && UIAccountTweaks.loggedInAsGuest()) {
          // In the guest mode for ChromeOS, changing UI language does not make
          // sense because it does not take effect after browser restart.
          uiLanguageButton.hidden = true;
          uiLanguageMessage.hidden = true;
        } else {
          uiLanguageButton.textContent =
              loadTimeData.getString('displayInThisLanguage');

          if (loadTimeData.valueExists('secondaryUser') &&
              loadTimeData.getBoolean('secondaryUser')) {
            uiLanguageButton.disabled = true;
            uiLanguageIndicator.setAttribute('controlled-by', 'shared');
          } else {
            uiLanguageButton.onclick = function(e) {
              chrome.send('uiLanguageChange', [languageCode]);
            };
          }
          showMutuallyExclusiveNodes(
              [uiLanguageButton, uiLanguageMessage, uiLanguageNotification], 0);
        }
      } else {
        uiLanguageMessage.textContent =
            loadTimeData.getString('cannotBeDisplayedInThisLanguage');
        showMutuallyExclusiveNodes(
            [uiLanguageButton, uiLanguageMessage, uiLanguageNotification], 1);
      }
    },

    /**
     * Updates the spell check language button/checkbox, dictionary download
     * dialog, and the "Enable spell checking" checkbox.
     * @param {string} languageCode Language code (ex. "fr").
     * @private
     */
    updateSpellCheckLanguageControls_: function(languageCode) {
      assert(languageCode);
      var spellCheckLanguageSection = $('language-options-spellcheck');
      var spellCheckLanguageButton = $('spellcheck-language-button');
      var spellCheckLanguageCheckboxContainer =
          $('spellcheck-language-checkbox-container');
      var spellCheckLanguageCheckbox = $('spellcheck-language-checkbox');
      var spellCheckLanguageMessage = $('spellcheck-language-message');
      var dictionaryDownloadInProgress =
          $('language-options-dictionary-downloading-message');
      var dictionaryDownloadFailed =
          $('language-options-dictionary-download-failed-message');
      var dictionaryDownloadFailHelp =
          $('language-options-dictionary-download-fail-help-message');

      spellCheckLanguageSection.hidden = false;
      spellCheckLanguageMessage.hidden = true;
      spellCheckLanguageButton.hidden = true;
      spellCheckLanguageCheckboxContainer.hidden = true;
      dictionaryDownloadInProgress.hidden = true;
      dictionaryDownloadFailed.hidden = true;
      dictionaryDownloadFailHelp.hidden = true;
      spellCheckLanguageCheckbox.checked = false;

      var canBeUsedForSpellchecking =
          languageCode in loadTimeData.getValue('spellCheckLanguageCodeSet');

      if (!canBeUsedForSpellchecking) {
        spellCheckLanguageMessage.textContent =
            loadTimeData.getString('cannotBeUsedForSpellChecking');
        spellCheckLanguageMessage.hidden = false;
        return;
      }

      var isUsedForSpellchecking = languageCode in this.spellCheckLanguages_;
      var isLanguageDownloaded =
          !(languageCode in this.spellcheckDictionaryDownloadStatus_);

      if (this.isMultilingualSpellcheckerEnabled_()) {
        spellCheckLanguageCheckbox.languageCode = languageCode;
        spellCheckLanguageCheckbox.checked = isUsedForSpellchecking;
        spellCheckLanguageCheckboxContainer.hidden = false;
      } else if (isUsedForSpellchecking) {
        if (isLanguageDownloaded) {
          spellCheckLanguageMessage.textContent =
              loadTimeData.getString('isUsedForSpellChecking');
          spellCheckLanguageMessage.hidden = false;
        }
      } else {
        spellCheckLanguageButton.textContent =
            loadTimeData.getString('useThisForSpellChecking');
        spellCheckLanguageButton.hidden = false;
        spellCheckLanguageButton.languageCode = languageCode;
      }

      switch (this.spellcheckDictionaryDownloadStatus_[languageCode]) {
        case DOWNLOAD_STATUS.IN_PROGRESS:
          dictionaryDownloadInProgress.hidden = false;
          break;
        case DOWNLOAD_STATUS.FAILED:
          showMutuallyExclusiveNodes(
              [spellCheckLanguageSection, dictionaryDownloadFailed], 1);
          if (this.spellcheckDictionaryDownloadFailures_ > 1)
            dictionaryDownloadFailHelp.hidden = false;
          $('dictionary-download-retry-button').languageCode = languageCode;
          break;
      }

      var areNoLanguagesSelected =
          Object.keys(this.spellCheckLanguages_).length == 0;
      var usesSystemSpellchecker = !$('enable-spellcheck-container');
      var isSpellcheckingEnabled = usesSystemSpellchecker ||
          this.isMultilingualSpellcheckerEnabled_() ||
          $('enable-spellcheck').checked;
      $('edit-custom-dictionary-button').hidden =
          areNoLanguagesSelected || !isSpellcheckingEnabled;
    },

    /**
     * Updates the checkbox for stopping translation.
     * @param {string} languageCode Language code (ex. "fr").
     * @private
     */
    updateOfferToTranslateCheckbox_: function(languageCode) {
      var div = $('language-options-offer-to-translate');

      // Translation server supports Chinese (Transitional) and Chinese
      // (Simplified) but not 'general' Chinese. To avoid ambiguity, we don't
      // show this preference when general Chinese is selected.
      if (languageCode != 'zh') {
        div.hidden = false;
      } else {
        div.hidden = true;
        return;
      }

      var offerToTranslate = div.querySelector('div');
      var cannotTranslate = $('cannot-translate-in-this-language');
      var nodes = [offerToTranslate, cannotTranslate];

      var convertedLangCode = this.convertLangCodeForTranslation_(languageCode);
      if (this.translateSupportedLanguages_.indexOf(convertedLangCode) != -1) {
        showMutuallyExclusiveNodes(nodes, 0);
      } else {
        showMutuallyExclusiveNodes(nodes, 1);
        return;
      }

      var checkbox = $('offer-to-translate-in-this-language');

      if (!this.enableTranslate_) {
        checkbox.disabled = true;
        checkbox.checked = false;
        return;
      }

      // If the language corresponds to the default target language (in most
      // cases, the user's locale language), "Offer to translate" checkbox
      // should be always unchecked.
      var defaultTargetLanguage =
          loadTimeData.getString('defaultTargetLanguage');
      if (convertedLangCode == defaultTargetLanguage) {
        checkbox.disabled = true;
        checkbox.checked = false;
        return;
      }

      checkbox.disabled = false;

      var blockedLanguages = this.translateBlockedLanguages_;
      var checked = blockedLanguages.indexOf(convertedLangCode) == -1;
      checkbox.checked = checked;
    },

    /**
     * Updates the input method list.
     * @param {string} languageCode Language code (ex. "fr").
     * @private
     */
    updateInputMethodList_: function(languageCode) {
      // Give one of the checkboxes or buttons focus, if it's specified in the
      // URL hash (ex. focus=mozc). Used for automated testing.
      var focusInputMethodId = -1;
      var match = document.location.hash.match(/\bfocus=([\w:-]+)\b/);
      if (match) {
        focusInputMethodId = match[1];
      }
      // Change the visibility of the input method list. Input methods that
      // matches |languageCode| will become visible.
      var inputMethodList = $('language-options-input-method-list');
      var methods = inputMethodList.querySelectorAll('.input-method');
      for (var i = 0; i < methods.length; i++) {
        var method = methods[i];
        if (languageCode in method.languageCodeSet) {
          method.hidden = false;
          var input = method.querySelector('input');
          // Give it focus if the ID matches.
          if (input.inputMethodId == focusInputMethodId) {
            input.focus();
          }
        } else {
          method.hidden = true;
        }
      }

      $('language-options-input-method-none').hidden =
          (languageCode in this.languageCodeToInputMethodIdsMap_);

      if (focusInputMethodId == 'add') {
        $('language-options-add-button').focus();
      }
    },

    /**
     * Updates the language list in the add language overlay.
     * @private
     */
    updateLanguageListInAddLanguageOverlay_: function() {
      // Change the visibility of the language list in the add language
      // overlay. Languages that are already active will become invisible,
      // so that users don't add the same language twice.
      var languageOptionsList = $('language-options-list');
      var languageCodes = languageOptionsList.getLanguageCodes();
      var languageCodeSet = {};
      for (var i = 0; i < languageCodes.length; i++) {
        languageCodeSet[languageCodes[i]] = true;
      }

      var addLanguageList = $('add-language-overlay-language-list');
      var options = addLanguageList.querySelectorAll('option');
      assert(options.length > 0);
      var selectedFirstItem = false;
      for (var i = 0; i < options.length; i++) {
        var option = options[i];
        option.hidden = option.value in languageCodeSet;
        if (!option.hidden && !selectedFirstItem) {
          // Select first visible item, otherwise previously selected hidden
          // item will be selected by default at the next time.
          option.selected = true;
          selectedFirstItem = true;
        }
      }
    },

    /**
     * Handles preloadEnginesPref change.
     * @param {Event} e Change event.
     * @private
     */
    handlePreloadEnginesPrefChange_: function(e) {
      var value = e.value.value;
      this.preloadEngines_ = this.filterBadPreloadEngines_(value.split(','));
      this.updateCheckboxesFromPreloadEngines_();
      $('language-options-list').updateDeletable();
    },

    /**
     * Handles enabledExtensionImePref change.
     * @param {Event} e Change event.
     * @private
     */
    handleEnabledExtensionsPrefChange_: function(e) {
      var value = e.value.value;
      this.enabledExtensionImes_ = value.split(',');
      this.updateCheckboxesFromEnabledExtensions_();
    },

    /**
     * Handles offer-to-translate checkbox's click event.
     * @param {Event} e Click event.
     * @private
     */
    handleOfferToTranslateCheckboxClick_: function(e) {
      var checkbox = e.target;
      var checked = checkbox.checked;

      var languageOptionsList = $('language-options-list');
      var selectedLanguageCode = languageOptionsList.getSelectedLanguageCode();

      if (checked)
        this.removeBlockedLanguage_(selectedLanguageCode);
      else
        this.addBlockedLanguage_(selectedLanguageCode);
    },

    /**
     * Handles input method checkbox's click event.
     * @param {Event} e Click event.
     * @private
     */
    handleCheckboxClick_: function(e) {
      var checkbox = assertInstanceof(e.target, Element);

      // Third party IMEs require additional confirmation prior to enabling due
      // to privacy risk.
      if (/^_ext_ime_/.test(checkbox.inputMethodId) && checkbox.checked) {
        var confirmationCallback = this.handleCheckboxUpdate_.bind(this,
                                                                   checkbox);
        var cancellationCallback = function() {
          checkbox.checked = false;
        };
        ThirdPartyImeConfirmOverlay.showConfirmationDialog({
          extension: checkbox.imeProvider,
          confirm: confirmationCallback,
          cancel: cancellationCallback
        });
      } else {
        this.handleCheckboxUpdate_(checkbox);
      }

      chrome.send('coreOptionsUserMetricsAction',
                  ['Options_Languages_InputMethodCheckbox' +
                   (checkbox.checked ? '_Enable' : '_Disable')]);
    },

    /**
     * Updates active IMEs based on change in state of a checkbox for an input
     * method.
     * @param {!Element} checkbox Updated checkbox element.
     * @private
     */
    handleCheckboxUpdate_: function(checkbox) {
      if (checkbox.inputMethodId.match(/^_ext_ime_/)) {
        this.updateEnabledExtensionsFromCheckboxes_();
        this.saveEnabledExtensionPref_();
        return;
      }
      if (this.preloadEngines_.length == 1 && !checkbox.checked) {
        // Don't allow disabling the last input method.
        this.showNotification_(
            loadTimeData.getString('pleaseAddAnotherInputMethod'),
            loadTimeData.getString('okButton'));
        checkbox.checked = true;
        return;
      }
      if (checkbox.checked) {
        chrome.send('inputMethodEnable', [checkbox.inputMethodId]);
      } else {
        chrome.send('inputMethodDisable', [checkbox.inputMethodId]);
      }
      this.updatePreloadEnginesFromCheckboxes_();
      this.preloadEngines_ = this.sortPreloadEngines_(this.preloadEngines_);
      this.savePreloadEnginesPref_();
    },

    /**
     * Handles clicks on the "OK" button of the "Add language" dialog.
     * @param {Event} e Click event.
     * @private
     */
    handleAddLanguageOkButtonClick_: function(e) {
      var languagesSelect = $('add-language-overlay-language-list');
      var selectedIndex = languagesSelect.selectedIndex;
      if (selectedIndex >= 0) {
        var selection = languagesSelect.options[selectedIndex];
        var langCode = String(selection.value);
        $('language-options-list').addLanguage(langCode);
        this.addBlockedLanguage_(langCode);
        PageManager.closeOverlay();
      }
    },

    /**
     * Checks if languageCode is deletable or not.
     * @param {string} languageCode the languageCode to check for deletability.
     */
    languageIsDeletable: function(languageCode) {
      // Don't allow removing the language if it's a UI language.
      if (languageCode == this.prospectiveUiLanguageCode_)
        return false;
      return (!cr.isChromeOS ||
              this.canDeleteLanguage_(languageCode));
    },

    /**
     * Handles browse.enable_spellchecking change.
     * @param {Event} e Change event.
     * @private
     */
    updateEnableSpellCheck_: function(e) {
      var value = !$('enable-spellcheck').checked;
      var languageControl = $(this.isMultilingualSpellcheckerEnabled_() ?
          'spellcheck-language-checkbox' : 'spellcheck-language-button');
      languageControl.disabled = value;
      if (!cr.isMac)
        $('edit-custom-dictionary-button').hidden = value;
    },

    /**
     * Handles translateBlockedLanguagesPref change.
     * @param {Event} e Change event.
     * @private
     */
    handleTranslateBlockedLanguagesPrefChange_: function(e) {
      this.translateBlockedLanguages_ = e.value.value;
      this.updateOfferToTranslateCheckbox_(
          $('language-options-list').getSelectedLanguageCode());
    },

    /**
     * Updates spellcheck dictionary UI (checkboxes, buttons, and labels) when
     * preferences change.
     * @param {Event} e Preference change event where e.value.value is the list
     * of languages currently used for spellchecking.
     * @private
     */
    handleSpellCheckDictionariesPrefChange_: function(e) {
      if (cr.isMac)
        return;

      var languages = e.value.value;
      this.spellCheckLanguages_ = {};
      for (var i = 0; i < languages.length; i++) {
        this.spellCheckLanguages_[languages[i]] = true;
      }
      this.updateSpellCheckLanguageControls_(
          $('language-options-list').getSelectedLanguageCode());
    },

    /**
     * Handles translate.enabled change.
     * @param {Event} e Change event.
     * @private
     */
    handleEnableTranslatePrefChange_: function(e) {
      var enabled = e.value.value;
      this.enableTranslate_ = enabled;
      this.updateOfferToTranslateCheckbox_(
          $('language-options-list').getSelectedLanguageCode());
    },

    /**
     * Handles spellCheckLanguageButton click.
     * @param {Event} e Click event.
     * @private
     */
    handleSpellCheckLanguageButtonClick_: function(e) {
      var languageCode = e.currentTarget.languageCode;
      // Save the preference.
      Preferences.setListPref(SPELL_CHECK_DICTIONARIES_PREF,
                              [languageCode], true);

      // The spellCheckLanguageChange argument is only used for logging.
      chrome.send('spellCheckLanguageChange', [languageCode]);
      chrome.send('coreOptionsUserMetricsAction',
                  ['Options_Languages_SpellCheck']);
    },

    /**
     * Updates the spellcheck.dictionaries preference with the currently
     * selected language codes.
     * @param {Event} e Click event. e.currentTarget represents the "Use this
     * language for spellchecking" checkbox.
     * @private
     */
    handleSpellCheckLanguageCheckboxClick_: function(e) {
      var languageCode = e.currentTarget.languageCode;

      if (e.currentTarget.checked)
        this.spellCheckLanguages_[languageCode] = true;
      else
        delete this.spellCheckLanguages_[languageCode];

      var languageCodes = Object.keys(this.spellCheckLanguages_);
      Preferences.setListPref(SPELL_CHECK_DICTIONARIES_PREF,
                              languageCodes, true);

      // The spellCheckLanguageChange argument is only used for logging.
      chrome.send('spellCheckLanguageChange', [languageCodes.join(',')]);
      chrome.send('coreOptionsUserMetricsAction',
                  ['Options_Languages_SpellCheck']);
    },

    /**
     * Checks whether it's possible to remove the language specified by
     * languageCode and returns true if possible. This function returns false
     * if the removal causes the number of preload engines to be zero.
     *
     * @param {string} languageCode Language code (ex. "fr").
     * @return {boolean} Returns true on success.
     * @private
     */
    canDeleteLanguage_: function(languageCode) {
      // First create the set of engines to be removed from input methods
      // associated with the language code.
      var enginesToBeRemovedSet = {};
      var inputMethodIds = this.languageCodeToInputMethodIdsMap_[languageCode];

      // If this language doesn't have any input methods, it can be deleted.
      if (!inputMethodIds)
        return true;

      for (var i = 0; i < inputMethodIds.length; i++) {
        enginesToBeRemovedSet[inputMethodIds[i]] = true;
      }

      // Then eliminate engines that are also used for other active languages.
      // For instance, if "xkb:us::eng" is used for both English and Filipino.
      var languageCodes = $('language-options-list').getLanguageCodes();
      for (var i = 0; i < languageCodes.length; i++) {
        // Skip the target language code.
        if (languageCodes[i] == languageCode) {
          continue;
        }
        // Check if input methods used in this language are included in
        // enginesToBeRemovedSet. If so, eliminate these from the set, so
        // we don't remove this time.
        var inputMethodIdsForAnotherLanguage =
            this.languageCodeToInputMethodIdsMap_[languageCodes[i]];
        if (!inputMethodIdsForAnotherLanguage)
          continue;

        for (var j = 0; j < inputMethodIdsForAnotherLanguage.length; j++) {
          var inputMethodId = inputMethodIdsForAnotherLanguage[j];
          if (inputMethodId in enginesToBeRemovedSet) {
            delete enginesToBeRemovedSet[inputMethodId];
          }
        }
      }

      // Update the preload engine list with the to-be-removed set.
      var newPreloadEngines = [];
      for (var i = 0; i < this.preloadEngines_.length; i++) {
        if (!(this.preloadEngines_[i] in enginesToBeRemovedSet)) {
          newPreloadEngines.push(this.preloadEngines_[i]);
        }
      }
      // Don't allow this operation if it causes the number of preload
      // engines to be zero.
      return (newPreloadEngines.length > 0);
    },

    /**
     * Saves the enabled extension preference.
     * @private
     */
    saveEnabledExtensionPref_: function() {
      Preferences.setStringPref(ENABLED_EXTENSION_IME_PREF,
                                this.enabledExtensionImes_.join(','), true);
    },

    /**
     * Updates the checkboxes in the input method list from the enabled
     * extensions preference.
     * @private
     */
    updateCheckboxesFromEnabledExtensions_: function() {
      // Convert the list into a dictonary for simpler lookup.
      var dictionary = {};
      for (var i = 0; i < this.enabledExtensionImes_.length; i++)
        dictionary[this.enabledExtensionImes_[i]] = true;

      var inputMethodList = $('language-options-input-method-list');
      var checkboxes = inputMethodList.querySelectorAll('input');
      for (var i = 0; i < checkboxes.length; i++) {
        if (checkboxes[i].inputMethodId.match(/^_ext_ime_/))
          checkboxes[i].checked = (checkboxes[i].inputMethodId in dictionary);
      }
      var configureButtons = inputMethodList.querySelectorAll('button');
      for (var i = 0; i < configureButtons.length; i++) {
        if (configureButtons[i].inputMethodId.match(/^_ext_ime_/)) {
          configureButtons[i].hidden =
              !(configureButtons[i].inputMethodId in dictionary);
        }
      }
    },

    /**
     * Updates the enabled extensions preference from the checkboxes in the
     * input method list.
     * @private
     */
    updateEnabledExtensionsFromCheckboxes_: function() {
      this.enabledExtensionImes_ = [];
      var inputMethodList = $('language-options-input-method-list');
      var checkboxes = inputMethodList.querySelectorAll('input');
      for (var i = 0; i < checkboxes.length; i++) {
        if (checkboxes[i].inputMethodId.match(/^_ext_ime_/)) {
          if (checkboxes[i].checked)
            this.enabledExtensionImes_.push(checkboxes[i].inputMethodId);
        }
      }
    },

    /**
     * Saves the preload engines preference.
     * @private
     */
    savePreloadEnginesPref_: function() {
      Preferences.setStringPref(PRELOAD_ENGINES_PREF,
                                this.preloadEngines_.join(','), true);
    },

    /**
     * Updates the checkboxes in the input method list from the preload
     * engines preference.
     * @private
     */
    updateCheckboxesFromPreloadEngines_: function() {
      // Convert the list into a dictonary for simpler lookup.
      var dictionary = {};
      for (var i = 0; i < this.preloadEngines_.length; i++) {
        dictionary[this.preloadEngines_[i]] = true;
      }

      var inputMethodList = $('language-options-input-method-list');
      var checkboxes = inputMethodList.querySelectorAll('input');
      for (var i = 0; i < checkboxes.length; i++) {
        if (!checkboxes[i].inputMethodId.match(/^_ext_ime_/))
          checkboxes[i].checked = (checkboxes[i].inputMethodId in dictionary);
      }
      var configureButtons = inputMethodList.querySelectorAll('button');
      for (var i = 0; i < configureButtons.length; i++) {
        if (!configureButtons[i].inputMethodId.match(/^_ext_ime_/)) {
          configureButtons[i].hidden =
              !(configureButtons[i].inputMethodId in dictionary);
        }
      }
    },

    /**
     * Updates the preload engines preference from the checkboxes in the
     * input method list.
     * @private
     */
    updatePreloadEnginesFromCheckboxes_: function() {
      this.preloadEngines_ = [];
      var inputMethodList = $('language-options-input-method-list');
      var checkboxes = inputMethodList.querySelectorAll('input');
      for (var i = 0; i < checkboxes.length; i++) {
        if (!checkboxes[i].inputMethodId.match(/^_ext_ime_/)) {
          if (checkboxes[i].checked)
            this.preloadEngines_.push(checkboxes[i].inputMethodId);
        }
      }
      var languageOptionsList = $('language-options-list');
      languageOptionsList.updateDeletable();
    },

    /**
     * Filters bad preload engines in case bad preload engines are
     * stored in the preference. Removes duplicates as well.
     * @param {Array} preloadEngines List of preload engines.
     * @private
     */
    filterBadPreloadEngines_: function(preloadEngines) {
      // Convert the list into a dictonary for simpler lookup.
      var dictionary = {};
      var list = loadTimeData.getValue('inputMethodList');
      for (var i = 0; i < list.length; i++) {
        dictionary[list[i].id] = true;
      }

      var enabledPreloadEngines = [];
      var seen = {};
      for (var i = 0; i < preloadEngines.length; i++) {
        // Check if the preload engine is present in the
        // dictionary, and not duplicate. Otherwise, skip it.
        // Component Extension IME should be handled same as preloadEngines and
        // "_comp_" is the special prefix of its ID.
        if ((preloadEngines[i] in dictionary && !(preloadEngines[i] in seen)) ||
            /^_comp_/.test(preloadEngines[i])) {
          enabledPreloadEngines.push(preloadEngines[i]);
          seen[preloadEngines[i]] = true;
        }
      }
      return enabledPreloadEngines;
    },

    // TODO(kochi): This is an adapted copy from new_tab.js.
    // If this will go as final UI, refactor this to share the component with
    // new new tab page.
    /**
     * @private
     */
    notificationTimeout_: null,

    /**
     * Shows notification.
     * @param {string} text
     * @param {string} actionText
     * @param {number=} opt_delay
     * @private
     */
    showNotification_: function(text, actionText, opt_delay) {
      var notificationElement = $('notification');
      var actionLink = notificationElement.querySelector('.link-color');
      var delay = opt_delay || 10000;

      function show() {
        window.clearTimeout(this.notificationTimeout_);
        notificationElement.classList.add('show');
        document.body.classList.add('notification-shown');
      }

      function hide() {
        window.clearTimeout(this.notificationTimeout_);
        notificationElement.classList.remove('show');
        document.body.classList.remove('notification-shown');
        // Prevent tabbing to the hidden link.
        actionLink.tabIndex = -1;
        // Setting tabIndex to -1 only prevents future tabbing to it. If,
        // however, the user switches window or a tab and then moves back to
        // this tab the element may gain focus. We therefore make sure that we
        // blur the element so that the element focus is not restored when
        // coming back to this window.
        actionLink.blur();
      }

      function delayedHide() {
        this.notificationTimeout_ = window.setTimeout(hide, delay);
      }

      notificationElement.firstElementChild.textContent = text;
      actionLink.textContent = actionText;

      actionLink.onclick = hide;
      actionLink.onkeydown = function(e) {
        if (e.keyIdentifier == 'Enter') {
          hide();
        }
      };
      notificationElement.onmouseover = show;
      notificationElement.onmouseout = delayedHide;
      actionLink.onfocus = show;
      actionLink.onblur = delayedHide;
      // Enable tabbing to the link now that it is shown.
      actionLink.tabIndex = 0;

      show();
      delayedHide();
    },

    /**
     * Chrome callback for when the UI language preference is saved.
     * @param {string} languageCode The newly selected language to use.
     * @private
     */
    uiLanguageSaved_: function(languageCode) {
      this.prospectiveUiLanguageCode_ = languageCode;

      // If the user is no longer on the same language code, ignore.
      if ($('language-options-list').getSelectedLanguageCode() != languageCode)
        return;

      // Special case for when a user changes to a different language, and
      // changes back to the same language without having restarted Chrome or
      // logged in/out of ChromeOS.
      if (languageCode == loadTimeData.getString('currentUiLanguageCode')) {
        this.updateUiLanguageButton_(languageCode);
        return;
      }

      // Otherwise, show a notification telling the user that their changes will
      // only take effect after restart.
      showMutuallyExclusiveNodes([$('language-options-ui-language-button'),
                                  $('language-options-ui-notification-bar')],
                                 1);
    },

    /**
     * A handler for when dictionary for |languageCode| begins downloading.
     * @param {string} languageCode The language of the dictionary that just
     *     began downloading.
     * @private
     */
    onDictionaryDownloadBegin_: function(languageCode) {
      this.spellcheckDictionaryDownloadStatus_[languageCode] =
          DOWNLOAD_STATUS.IN_PROGRESS;
      if (!cr.isMac &&
          languageCode ==
              $('language-options-list').getSelectedLanguageCode()) {
        this.updateSpellCheckLanguageControls_(languageCode);
      }
    },

    /**
     * A handler for when dictionary for |languageCode| successfully downloaded.
     * @param {string} languageCode The language of the dictionary that
     *     succeeded downloading.
     * @private
     */
    onDictionaryDownloadSuccess_: function(languageCode) {
      delete this.spellcheckDictionaryDownloadStatus_[languageCode];
      this.spellcheckDictionaryDownloadFailures_ = 0;
      if (!cr.isMac &&
          languageCode ==
              $('language-options-list').getSelectedLanguageCode()) {
        this.updateSpellCheckLanguageControls_(languageCode);
      }
    },

    /**
     * A handler for when dictionary for |languageCode| fails to download.
     * @param {string} languageCode The language of the dictionary that failed
     *     to download.
     * @private
     */
    onDictionaryDownloadFailure_: function(languageCode) {
      this.spellcheckDictionaryDownloadStatus_[languageCode] =
          DOWNLOAD_STATUS.FAILED;
      this.spellcheckDictionaryDownloadFailures_++;
      if (!cr.isMac &&
          languageCode ==
              $('language-options-list').getSelectedLanguageCode()) {
        this.updateSpellCheckLanguageControls_(languageCode);
      }
    },

    /**
     * Converts the language code for Translation. There are some differences
     * between the language set for Translation and that for Accept-Language.
     * @param {string} languageCode The language code like 'fr'.
     * @return {string} The converted language code.
     * @private
     */
    convertLangCodeForTranslation_: function(languageCode) {
      var tokens = languageCode.split('-');
      var main = tokens[0];

      // See also: components/translate/core/browser/common/translate_util.cc
      var synonyms = {
        'nb': 'no',
        'he': 'iw',
        'jv': 'jw',
        'fil': 'tl',
        'zh-HK': 'zh-TW',
        'zh-MO': 'zh-TW',
        'zh-SG': 'zh-CN',
      };

      if (main in synonyms) {
        return synonyms[main];
      } else if (main == 'zh') {
        // In Translation, general Chinese is not used, and the sub code is
        // necessary as a language code for Translate server.
        return languageCode;
      }

      return main;
    },

    /**
     * Handles activate-ime-menu checkbox's click event.
     * @param {Event} e Click event.
     * @private
     */
    handleActivateImeMenuCheckboxClick_: function(e) {
      if (cr.isChromeOS) {
        var checkbox = e.target;
        Preferences.setBooleanPref(ACTIVATE_IME_MENU_PREF,
                                   checkbox.checked, true);
      }
    },
  };

  /**
   * Shows the node at |index| in |nodes|, hides all others.
   * @param {Array<HTMLElement>} nodes The nodes to be shown or hidden.
   * @param {number} index The index of |nodes| to show.
   */
  function showMutuallyExclusiveNodes(nodes, index) {
    assert(index >= 0 && index < nodes.length);
    for (var i = 0; i < nodes.length; ++i) {
      assert(nodes[i] instanceof HTMLElement);  // TODO(dbeam): Ignore null?
      nodes[i].hidden = i != index;
    }
  }

  LanguageOptions.uiLanguageSaved = function(languageCode) {
    LanguageOptions.getInstance().uiLanguageSaved_(languageCode);
  };

  LanguageOptions.onDictionaryDownloadBegin = function(languageCode) {
    LanguageOptions.getInstance().onDictionaryDownloadBegin_(languageCode);
  };

  LanguageOptions.onDictionaryDownloadSuccess = function(languageCode) {
    LanguageOptions.getInstance().onDictionaryDownloadSuccess_(languageCode);
  };

  LanguageOptions.onDictionaryDownloadFailure = function(languageCode) {
    LanguageOptions.getInstance().onDictionaryDownloadFailure_(languageCode);
  };

  // Export
  return {
    LanguageOptions: LanguageOptions
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  var Page = cr.ui.pageManager.Page;
  var PageManager = cr.ui.pageManager.PageManager;
  var ArrayDataModel = cr.ui.ArrayDataModel;

  /**
   * ManageProfileOverlay class
   * Encapsulated handling of the 'Manage profile...' overlay page.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function ManageProfileOverlay() {
    Page.call(this, 'manageProfile',
              loadTimeData.getString('manageProfileTabTitle'),
              'manage-profile-overlay');
  };

  cr.addSingletonGetter(ManageProfileOverlay);

  ManageProfileOverlay.prototype = {
    // Inherit from Page.
    __proto__: Page.prototype,

    // Info about the currently managed/deleted profile.
    profileInfo_: null,

    // Whether the currently chosen name for a new profile was assigned
    // automatically by choosing an avatar. Set on receiveNewProfileDefaults;
    // cleared on first edit (in onNameChanged_).
    profileNameIsDefault_: false,

    // List of default profile names corresponding to the respective icons.
    defaultProfileNames_: [],

    // An object containing all names of existing profiles.
    existingProfileNames_: {},

    // The currently selected icon in the icon grid.
    iconGridSelectedURL_: null,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      var self = this;
      options.ProfilesIconGrid.decorate($('manage-profile-icon-grid'));
      options.ProfilesIconGrid.decorate($('create-profile-icon-grid'));
      self.registerCommonEventHandlers_('create',
                                        self.submitCreateProfile_.bind(self));
      self.registerCommonEventHandlers_('manage',
                                        self.submitManageChanges_.bind(self));

      // Override the create-profile-ok and create-* keydown handlers, to avoid
      // closing the overlay until we finish creating the profile.
      $('create-profile-ok').onclick = function(event) {
        self.submitCreateProfile_();
      };

      $('create-profile-cancel').onclick = function(event) {
        CreateProfileOverlay.cancelCreateProfile();
      };

      $('manage-profile-cancel').onclick =
          $('disconnect-managed-profile-cancel').onclick =
          $('delete-profile-cancel').onclick = function(event) {
        PageManager.closeOverlay();
      };
      $('delete-profile-ok').onclick = function(event) {
        PageManager.closeOverlay();
        chrome.send('deleteProfile', [self.profileInfo_.filePath]);
        options.SupervisedUserListData.resetPromise();
      };
      $('add-shortcut-button').onclick = function(event) {
        chrome.send('addProfileShortcut', [self.profileInfo_.filePath]);
      };
      $('remove-shortcut-button').onclick = function(event) {
        chrome.send('removeProfileShortcut', [self.profileInfo_.filePath]);
      };

      $('disconnect-managed-profile-ok').onclick = function(event) {
        PageManager.closeOverlay();
        chrome.send('deleteProfile',
                    [BrowserOptions.getCurrentProfile().filePath]);
      };

      $('create-profile-supervised-signed-in-learn-more-link').onclick =
          function(event) {
        PageManager.showPageByName('supervisedUserLearnMore');
        return false;
      };

      $('create-profile-supervised-sign-in-link').onclick =
          function(event) {
        SyncSetupOverlay.startSignIn('access-point-supervised-user');
      };

      $('create-profile-supervised-sign-in-again-link').onclick =
          function(event) {
        SyncSetupOverlay.showSetupUI();
      };

      $('import-existing-supervised-user-link').onclick = function(event) {
        // Hide the import button to trigger a cursor update. The import button
        // is shown again when the import overlay loads. TODO(akuegel): Remove
        // this temporary fix when crbug/246304 is resolved.
        $('import-existing-supervised-user-link').hidden = true;
        PageManager.showPageByName('supervisedUserImport');
      };
    },

    /** @override */
    didShowPage: function() {
      chrome.send('requestDefaultProfileIcons', ['manage']);

      // Just ignore the manage profile dialog on Chrome OS, they use /accounts.
      if (!cr.isChromeOS && window.location.pathname == '/manageProfile')
        ManageProfileOverlay.getInstance().prepareForManageDialog_();

      // When editing a profile, initially hide the "add shortcut" and
      // "remove shortcut" buttons and ask the handler which to show. It will
      // call |receiveHasProfileShortcuts|, which will show the appropriate one.
      $('remove-shortcut-button').hidden = true;
      $('add-shortcut-button').hidden = true;

      if (loadTimeData.getBoolean('profileShortcutsEnabled')) {
        var profileInfo = ManageProfileOverlay.getInstance().profileInfo_;
        chrome.send('requestHasProfileShortcuts', [profileInfo.filePath]);
      }

      var manageNameField = $('manage-profile-name');
      // Legacy supervised users cannot edit their names.
      if (manageNameField.disabled)
        $('manage-profile-ok').focus();
      else
        manageNameField.focus();

      this.profileNameIsDefault_ = false;
    },

    /**
     * Registers event handlers that are common between create and manage modes.
     * @param {string} mode A label that specifies the type of dialog box which
     *     is currently being viewed (i.e. 'create' or 'manage').
     * @param {function()} submitFunction The function that should be called
     *     when the user chooses to submit (e.g. by clicking the OK button).
     * @private
     */
    registerCommonEventHandlers_: function(mode, submitFunction) {
      var self = this;
      $(mode + '-profile-icon-grid').addEventListener('change', function(e) {
        self.onIconGridSelectionChanged_(mode);
      });
      $(mode + '-profile-name').oninput = function(event) {
        self.onNameChanged_(mode);
      };
      $(mode + '-profile-ok').onclick = function(event) {
        PageManager.closeOverlay();
        submitFunction();
      };
    },

    /**
     * Set the profile info used in the dialog.
     * @param {Object} profileInfo An object of the form:
     *     profileInfo = {
     *       name: "Profile Name",
     *       iconURL: "http://chromesettings.github.io/path/to/icon/image",
     *       filePath: "/path/to/profile/data/on/disk",
     *       isCurrentProfile: false,
     *       isSupervised: false
     *     };
     * @param {string} mode A label that specifies the type of dialog box which
     *     is currently being viewed (i.e. 'create' or 'manage').
     * @private
     */
    setProfileInfo_: function(profileInfo, mode) {
      this.iconGridSelectedURL_ = profileInfo.iconURL;
      this.profileInfo_ = profileInfo;
      $(mode + '-profile-name').value = profileInfo.name;
      $(mode + '-profile-icon-grid').selectedItem = profileInfo.iconURL;
    },

    /**
     * Sets the name of the profile being edited or created.
     * @param {string} name New profile name.
     * @param {string} mode A label that specifies the type of dialog box which
     *     is currently being viewed (i.e. 'create' or 'manage').
     * @private
     */
    setProfileName_: function(name, mode) {
      if (this.profileInfo_)
        this.profileInfo_.name = name;
      $(mode + '-profile-name').value = name;
    },

    /**
     * Set an array of default icon URLs. These will be added to the grid that
     * the user will use to choose their profile icon.
     * @param {string} mode A label that specifies the type of dialog box which
     *     is currently being viewed (i.e. 'create' or 'manage').
     * @param {!Array<string>} iconURLs An array of icon URLs.
     * @param {Array<string>} names An array of default names
     *     corresponding to the icons.
     * @private
     */
    receiveDefaultProfileIconsAndNames_: function(mode, iconURLs, names) {
      this.defaultProfileNames_ = names;

      var grid = $(mode + '-profile-icon-grid');

      grid.dataModel = new ArrayDataModel(iconURLs);

      if (this.profileInfo_)
        grid.selectedItem = this.profileInfo_.iconURL;

      // Recalculate the measured item size.
      grid.measured_ = null;
      grid.columns = 0;
      grid.redraw();
    },

    /**
     * Callback to set the initial values when creating a new profile.
     * @param {Object} profileInfo An object of the form:
     *     profileInfo = {
     *       name: "Profile Name",
     *       iconURL: "http://chromesettings.github.io/path/to/icon/image",
     *     };
     * @private
     */
    receiveNewProfileDefaults_: function(profileInfo) {
      ManageProfileOverlay.setProfileInfo(profileInfo, 'create');
      this.profileNameIsDefault_ = true;
      $('create-profile-name-label').hidden = false;
      $('create-profile-name').hidden = false;
      // Trying to change the focus if this isn't the topmost overlay can
      // instead cause the FocusManager to override another overlay's focus,
      // e.g. if an overlay above this one is in the process of being reloaded.
      // But the C++ handler calls this method directly on ManageProfileOverlay,
      // so check the pageDiv to also include its subclasses (in particular
      // CreateProfileOverlay, which has higher sub-overlays).
      if (PageManager.getTopmostVisiblePage().pageDiv == this.pageDiv) {
        // This will only have an effect if the 'create-profile-name' element
        //  is visible, i.e. if the overlay is in create mode.
        $('create-profile-name').focus();
      }
      $('create-profile-ok').disabled = false;
    },

    /**
     * Set a dictionary of all profile names. These are used to prevent the
     * user from naming two profiles the same.
     * @param {Object} profileNames A dictionary of profile names.
     * @private
     */
    receiveExistingProfileNames_: function(profileNames) {
      this.existingProfileNames_ = profileNames;
    },

    /**
     * Callback to show the add/remove shortcut buttons when in edit mode,
     * called by the handler as a result of the 'requestHasProfileShortcuts_'
     * message.
     * @param {boolean} hasShortcuts Whether profile has any existing shortcuts.
     * @private
     */
    receiveHasProfileShortcuts_: function(hasShortcuts) {
      $('add-shortcut-button').hidden = hasShortcuts;
      $('remove-shortcut-button').hidden = !hasShortcuts;
    },

    /**
     * Display the error bubble, with |errorHtml| in the bubble.
     * @param {string} errorHtml The html string to display as an error.
     * @param {string} mode A label that specifies the type of dialog box which
     *     is currently being viewed (i.e. 'create' or 'manage').
     * @param {boolean} disableOKButton True if the dialog's OK button should be
     *     disabled when the error bubble is shown. It will be (re-)enabled when
     *     the error bubble is hidden.
     * @private
     */
    showErrorBubble_: function(errorHtml, mode, disableOKButton) {
      var nameErrorEl = $(mode + '-profile-error-bubble');
      nameErrorEl.hidden = false;
      nameErrorEl.innerHTML = errorHtml;

      if (disableOKButton)
        $(mode + '-profile-ok').disabled = true;
    },

    /**
     * Hide the error bubble.
     * @param {string} mode A label that specifies the type of dialog box which
     *     is currently being viewed (i.e. 'create' or 'manage').
     * @private
     */
    hideErrorBubble_: function(mode) {
      $(mode + '-profile-error-bubble').innerHTML = '';
      $(mode + '-profile-error-bubble').hidden = true;
      $(mode + '-profile-ok').disabled = false;
    },

    /**
     * oninput callback for <input> field.
     * @param {string} mode A label that specifies the type of dialog box which
     *     is currently being viewed (i.e. 'create' or 'manage').
     * @private
     */
    onNameChanged_: function(mode) {
      this.profileNameIsDefault_ = false;
      this.updateCreateOrImport_(mode);
    },

    /**
     * Called when the profile name is changed or the 'create supervised'
     * checkbox is toggled. Updates the 'ok' button and the 'import existing
     * supervised user' link.
     * @param {string} mode A label that specifies the type of dialog box which
     *     is currently being viewed (i.e. 'create' or 'manage').
     * @private
     */
    updateCreateOrImport_: function(mode) {
      this.updateOkButton_(mode);
      // In 'create' mode, check for existing supervised users with the same
      // name.
      if (mode == 'create')
        this.requestExistingSupervisedUsers_();
    },

    /**
     * Tries to get the list of existing supervised users and updates the UI
     * accordingly.
     * @private
     */
    requestExistingSupervisedUsers_: function() {
      options.SupervisedUserListData.requestExistingSupervisedUsers().then(
          this.receiveExistingSupervisedUsers_.bind(this),
          this.onSigninError_.bind(this));
    },

    /**
     * @param {Object} supervisedUser
     * @param {boolean} nameIsUnique
     */
    getImportHandler_: function(supervisedUser, nameIsUnique) {
      return function() {
        if (supervisedUser.needAvatar || !nameIsUnique) {
          PageManager.showPageByName('supervisedUserImport');
        } else {
          this.hideErrorBubble_('create');
          CreateProfileOverlay.updateCreateInProgress(true);
          chrome.send('createProfile',
              [supervisedUser.name, supervisedUser.iconURL, false, true,
                   supervisedUser.id]);
        }
      }.bind(this);
    },

    /**
     * Callback which receives the list of existing supervised users. Checks if
     * the currently entered name is the name of an already existing supervised
     * user. If yes, the user is prompted to import the existing supervised
     * user, and the create button is disabled.
     * If the received list is empty, hides the "import" link.
     * @param {Array<Object>} supervisedUsers The list of existing supervised
     *     users.
     * @private
     */
    receiveExistingSupervisedUsers_: function(supervisedUsers) {
      // After a supervised user has been created and the dialog has been
      // hidden, this gets called again with a list including
      // the just-created SU. Ignore, to prevent the "already exists" bubble
      // from showing up if the overlay is already hidden.
      if (PageManager.getTopmostVisiblePage().pageDiv != this.pageDiv)
        return;
      $('import-existing-supervised-user-link').hidden =
          supervisedUsers.length === 0;
      if (!$('create-profile-supervised').checked)
        return;

      var newName = $('create-profile-name').value;
      var i;
      for (i = 0; i < supervisedUsers.length; ++i) {
        if (supervisedUsers[i].name != newName)
          continue;
        // Check if another supervised user also exists with that name.
        var nameIsUnique = true;
        // Handling the case when multiple supervised users with the same
        // name exist, but not all of them are on the device.
        // If at least one is not imported, we want to offer that
        // option to the user. This could happen due to a bug that allowed
        // creating SUs with the same name (https://crbug.com/557445).
        var allOnCurrentDevice = supervisedUsers[i].onCurrentDevice;
        var j;
        for (j = i + 1; j < supervisedUsers.length; ++j) {
          if (supervisedUsers[j].name == newName) {
            nameIsUnique = false;
            allOnCurrentDevice = allOnCurrentDevice &&
               supervisedUsers[j].onCurrentDevice;
          }
        }

        var errorHtml = allOnCurrentDevice ?
            loadTimeData.getStringF(
                'managedProfilesExistingLocalSupervisedUser') :
            loadTimeData.getStringF(
                'manageProfilesExistingSupervisedUser',
                HTMLEscape(elide(newName, /* maxLength */ 50)));
        this.showErrorBubble_(errorHtml, 'create', true);

        if ($('supervised-user-import-existing')) {
          $('supervised-user-import-existing').onclick =
              this.getImportHandler_(supervisedUsers[i], nameIsUnique);
        }
        $('create-profile-ok').disabled = true;
        return;
      }
    },

    /**
     * Called in case the request for the list of supervised users fails because
     * of a signin error.
     * @private
     */
    onSigninError_: function() {
      this.updateSignedInStatus(this.signedInEmail_, true);
    },

    /**
     * Called to update the state of the ok button depending if the name is
     * already used or not.
     * @param {string} mode A label that specifies the type of dialog box which
     *     is currently being viewed (i.e. 'create' or 'manage').
     * @private
     */
    updateOkButton_: function(mode) {
      var oldName = this.profileInfo_.name;
      var newName = $(mode + '-profile-name').value;
      this.hideErrorBubble_(mode);

      var nameIsValid = $(mode + '-profile-name').validity.valid;
      $(mode + '-profile-ok').disabled = !nameIsValid;
    },

    /**
     * Called when the user clicks "OK" or hits enter. Saves the newly changed
     * profile info.
     * @private
     */
    submitManageChanges_: function() {
      var name = $('manage-profile-name').value;
      var iconURL = $('manage-profile-icon-grid').selectedItem;

      chrome.send('setProfileIconAndName',
                  [this.profileInfo_.filePath, iconURL, name]);
      if (name != this.profileInfo_.name)
        options.SupervisedUserListData.resetPromise();
    },

    /**
     * Abstract method. Should be overriden in subclasses.
     * @param {string} email
     * @param {boolean} hasError
     * @protected
     */
    updateSignedInStatus: function(email, hasError) {
      // TODO: Fix triggering the assert, crbug.com/423267
      // assertNotReached();
    },

    /**
     * Called when the user clicks "OK" or hits enter. Creates the profile
     * using the information in the dialog.
     * @private
     */
    submitCreateProfile_: function() {
      // This is visual polish: the UI to access this should be disabled for
      // supervised users, and the back end will prevent user creation anyway.
      if (this.profileInfo_ && this.profileInfo_.isSupervised)
        return;

      this.hideErrorBubble_('create');
      CreateProfileOverlay.updateCreateInProgress(true);

      // Get the user's chosen name and icon, or default if they do not
      // wish to customize their profile.
      var name = $('create-profile-name').value;
      var iconUrl = $('create-profile-icon-grid').selectedItem;
      var createShortcut = $('create-shortcut').checked;
      var isSupervised = $('create-profile-supervised').checked;
      var existingSupervisedUserId = '';

      // 'createProfile' is handled by the CreateProfileHandler.
      chrome.send('createProfile',
                  [name, iconUrl, createShortcut,
                   isSupervised, existingSupervisedUserId]);
    },

    /**
     * Called when the selected icon in the icon grid changes.
     * @param {string} mode A label that specifies the type of dialog box which
     *     is currently being viewed (i.e. 'create' or 'manage').
     * @private
     */
    onIconGridSelectionChanged_: function(mode) {
      var iconURL = $(mode + '-profile-icon-grid').selectedItem;
      if (!iconURL || iconURL == this.iconGridSelectedURL_)
        return;
      this.iconGridSelectedURL_ = iconURL;
      if (this.profileNameIsDefault_) {
        var index = $(mode + '-profile-icon-grid').selectionModel.selectedIndex;
        var name = this.defaultProfileNames_[index];
        if (name) {
          this.setProfileName_(name, mode);
          this.updateCreateOrImport_(mode);
        }
      }
      if (this.profileInfo_ && this.profileInfo_.filePath) {
        chrome.send('profileIconSelectionChanged',
                    [this.profileInfo_.filePath, iconURL]);
      }
    },

    /**
     * Updates the contents of the "Manage Profile" section of the dialog,
     * and shows that section.
     * @private
     */
    prepareForManageDialog_: function() {
      chrome.send('refreshGaiaPicture');
      var profileInfo = BrowserOptions.getCurrentProfile();
      ManageProfileOverlay.setProfileInfo(profileInfo, 'manage');
      $('manage-profile-overlay-create').hidden = true;
      $('manage-profile-overlay-manage').hidden = false;
      $('manage-profile-overlay-delete').hidden = true;
      $('manage-profile-overlay-disconnect-managed').hidden = true;
      $('manage-profile-name').disabled =
          profileInfo.isSupervised && !profileInfo.isChild;
      this.hideErrorBubble_('manage');
    },

    /**
     * Display the "Manage Profile" dialog.
     * @param {boolean=} opt_updateHistory If we should update the history after
     *     showing the dialog (defaults to true).
     * @private
     */
    showManageDialog_: function(opt_updateHistory) {
      var updateHistory = opt_updateHistory !== false;
      this.prepareForManageDialog_();
      PageManager.showPageByName('manageProfile', updateHistory);
    },

    /**
     * Display the "Delete Profile" dialog.
     * @param {Object} profileInfo The profile object of the profile to delete.
     * @private
     */
    showDeleteDialog_: function(profileInfo) {
      ManageProfileOverlay.setProfileInfo(profileInfo, 'manage');
      $('manage-profile-overlay-create').hidden = true;
      $('manage-profile-overlay-manage').hidden = true;
      $('manage-profile-overlay-delete').hidden = false;
      $('manage-profile-overlay-disconnect-managed').hidden = true;
      $('delete-profile-icon').style.content =
          getProfileAvatarIcon(profileInfo.iconURL);
      $('delete-profile-text').textContent =
          loadTimeData.getStringF('deleteProfileMessage',
                                  elide(profileInfo.name, /* maxLength */ 50));
      $('delete-supervised-profile-addendum').hidden =
          !profileInfo.isSupervised || profileInfo.isChild;

      // Because this dialog isn't useful when refreshing or as part of the
      // history, don't create a history entry for it when showing.
      PageManager.showPageByName('manageProfile', false);
      chrome.send('logDeleteUserDialogShown');
    },

    /**
     * Display the "Disconnect Managed Profile" dialog.
     * @private
     */
    showDisconnectManagedProfileDialog_: function(replacements) {
      loadTimeData.overrideValues(replacements);
      $('manage-profile-overlay-create').hidden = true;
      $('manage-profile-overlay-manage').hidden = true;
      $('manage-profile-overlay-delete').hidden = true;
      $('disconnect-managed-profile-domain-information').innerHTML =
          loadTimeData.getString('disconnectManagedProfileDomainInformation');
      $('disconnect-managed-profile-text').innerHTML =
          loadTimeData.getString('disconnectManagedProfileText');
      $('manage-profile-overlay-disconnect-managed').hidden = false;

      // Because this dialog isn't useful when refreshing or as part of the
      // history, don't create a history entry for it when showing.
      PageManager.showPageByName('manageProfile', false);
    },

    /**
     * Display the "Create Profile" dialog.
     * @private
     */
    showCreateDialog_: function() {
      PageManager.showPageByName('createProfile');
    },
  };

  // Forward public APIs to private implementations.
  cr.makePublic(ManageProfileOverlay, [
    'receiveDefaultProfileIconsAndNames',
    'receiveNewProfileDefaults',
    'receiveExistingProfileNames',
    'receiveHasProfileShortcuts',
    'setProfileInfo',
    'setProfileName',
    'showManageDialog',
    'showDeleteDialog',
    'showDisconnectManagedProfileDialog',
    'showCreateDialog',
  ]);

  function CreateProfileOverlay() {
    Page.call(this, 'createProfile',
              loadTimeData.getString('createProfileTabTitle'),
              'manage-profile-overlay');
  };

  cr.addSingletonGetter(CreateProfileOverlay);

  CreateProfileOverlay.prototype = {
    // Inherit from ManageProfileOverlay.
    __proto__: ManageProfileOverlay.prototype,

    // The signed-in email address of the current profile, or empty if they're
    // not signed in.
    signedInEmail_: '',

    /** @override */
    canShowPage: function() {
      return !BrowserOptions.getCurrentProfile().isSupervised;
    },

    /**
     * Configures the overlay to the "create user" mode.
     * @override
     */
    didShowPage: function() {
      chrome.send('requestCreateProfileUpdate');
      chrome.send('requestDefaultProfileIcons', ['create']);
      chrome.send('requestNewProfileDefaults');

      $('manage-profile-overlay-create').hidden = false;
      $('manage-profile-overlay-manage').hidden = true;
      $('manage-profile-overlay-delete').hidden = true;
      $('manage-profile-overlay-disconnect-managed').hidden = true;
      $('create-profile-instructions').textContent =
         loadTimeData.getStringF('createProfileInstructions');
      this.hideErrorBubble_();
      this.updateCreateInProgress_(false);

      var shortcutsEnabled = loadTimeData.getBoolean('profileShortcutsEnabled');
      $('create-shortcut-container').hidden = !shortcutsEnabled;
      $('create-shortcut').checked = shortcutsEnabled;

      $('create-profile-name-label').hidden = true;
      $('create-profile-name').hidden = true;
      $('create-profile-ok').disabled = true;

      $('create-profile-supervised').checked = false;
      $('import-existing-supervised-user-link').hidden = true;
      $('create-profile-supervised').onchange = function() {
        ManageProfileOverlay.getInstance().updateCreateOrImport_('create');
      };
      $('create-profile-supervised').hidden = true;
      $('create-profile-supervised-signed-in').disabled = true;
      $('create-profile-supervised-signed-in').hidden = true;
      $('create-profile-supervised-not-signed-in').hidden = true;

      this.profileNameIsDefault_ = false;
    },

    /** @override */
    handleCancel: function() {
      this.cancelCreateProfile_();
    },

    /** @override */
    showErrorBubble_: function(errorHtml) {
      ManageProfileOverlay.getInstance().showErrorBubble_(errorHtml,
                                                          'create',
                                                          false);
    },

    /** @override */
    hideErrorBubble_: function() {
      ManageProfileOverlay.getInstance().hideErrorBubble_('create');
    },

    /**
     * Updates the UI when a profile create step begins or ends.
     * Note that hideErrorBubble_() also enables the "OK" button, so it
     * must be called before this function if both are used.
     * @param {boolean} inProgress True if the UI should be updated to show that
     *     profile creation is now in progress.
     * @private
     */
    updateCreateInProgress_: function(inProgress) {
      this.createInProgress_ = inProgress;
      this.updateCreateSupervisedUserCheckbox_();

      $('create-profile-icon-grid').disabled = inProgress;
      $('create-profile-name').disabled = inProgress;
      $('create-shortcut').disabled = inProgress;
      $('create-profile-ok').disabled = inProgress;
      $('import-existing-supervised-user-link').disabled = inProgress;

      $('create-profile-throbber').hidden = !inProgress;
    },

    /**
     * Cancels the creation of the a profile. It is safe to call this even
     * when no profile is in the process of being created.
     * @private
     */
    cancelCreateProfile_: function() {
      PageManager.closeOverlay();
      chrome.send('cancelCreateProfile');
      this.hideErrorBubble_();
      this.updateCreateInProgress_(false);
    },

    /**
     * Shows an error message describing an error that occurred while creating
     * a new profile.
     * Called by BrowserOptions via the BrowserOptionsHandler.
     * @param {string} error The error message to display.
     * @private
     */
    onError_: function(error) {
      this.updateCreateInProgress_(false);
      this.showErrorBubble_(error);
    },

    /**
     * Shows a warning message giving information while creating a new profile.
     * Called by BrowserOptions via the BrowserOptionsHandler.
     * @param {string} warning The warning message to display.
     * @private
     */
    onWarning_: function(warning) {
      this.showErrorBubble_(warning);
    },

    /**
     * For new supervised users, shows a confirmation page after successfully
     * creating a new profile; otherwise, the handler will open a new window.
     * @param {Object} profileInfo An object of the form:
     *     profileInfo = {
     *       name: "Profile Name",
     *       filePath: "/path/to/profile/data/on/disk"
     *       isSupervised: (true|false),
     *     };
     * @private
     */
    onSuccess_: function(profileInfo) {
      this.updateCreateInProgress_(false);
      PageManager.closeOverlay();
      if (profileInfo.isSupervised) {
        options.SupervisedUserListData.resetPromise();
        profileInfo.custodianEmail = this.signedInEmail_;
        SupervisedUserCreateConfirmOverlay.setProfileInfo(profileInfo);
        PageManager.showPageByName('supervisedUserCreateConfirm', false);
        BrowserOptions.updateManagesSupervisedUsers(true);
      }
    },

    /**
     * @param {string} email
     * @param {boolean} hasError
     * @override
     */
    updateSignedInStatus: function(email, hasError) {
      this.updateSignedInStatus_(email, hasError);
    },

    /**
     * Updates the signed-in or not-signed-in UI when in create mode. Called by
     * the handler in response to the 'requestCreateProfileUpdate' message.
     * updateSupervisedUsersAllowed_ is expected to be called after this is, and
     * will update additional UI elements.
     * @param {string} email The email address of the currently signed-in user.
     *     An empty string indicates that the user is not signed in.
     * @param {boolean} hasError Whether the user's sign-in credentials are
     *     still valid.
     * @private
     */
    updateSignedInStatus_: function(email, hasError) {
      this.signedInEmail_ = email;
      this.hasError_ = hasError;
      var isSignedIn = email !== '';
      $('create-profile-supervised').hidden = !isSignedIn;
      $('create-profile-supervised-signed-in').hidden = !isSignedIn;
      $('create-profile-supervised-not-signed-in').hidden = isSignedIn;

      if (isSignedIn) {
        var accountDetailsOutOfDate =
            $('create-profile-supervised-account-details-out-of-date-label');
        accountDetailsOutOfDate.textContent = loadTimeData.getStringF(
            'manageProfilesSupervisedAccountDetailsOutOfDate', email);
        accountDetailsOutOfDate.hidden = !hasError;

        $('create-profile-supervised-signed-in-label').textContent =
            loadTimeData.getStringF(
                'manageProfilesSupervisedSignedInLabel', email);
        $('create-profile-supervised-signed-in-label').hidden = hasError;

        $('create-profile-supervised-sign-in-again-link').hidden = !hasError;
        $('create-profile-supervised-signed-in-learn-more-link').hidden =
            hasError;
      }

      this.updateCreateSupervisedUserCheckbox_();
      // If we're signed in, showing/hiding import-existing-supervised-user-link
      // is handled in receiveExistingSupervisedUsers_.
      if (isSignedIn && !hasError)
        this.requestExistingSupervisedUsers_();
      else
        $('import-existing-supervised-user-link').hidden = true;
    },

    /**
     * Sets whether creating supervised users is allowed or not. Called by the
     * handler in response to the 'requestCreateProfileUpdate' message or a
     * change in the (policy-controlled) pref that prohibits creating supervised
     * users, after the signed-in status has been updated.
     * @param {boolean} allowed True if creating supervised users should be
     *     allowed.
     * @private
     */
    updateSupervisedUsersAllowed_: function(allowed) {
      this.supervisedUsersAllowed_ = allowed;
      this.updateCreateSupervisedUserCheckbox_();

      $('create-profile-supervised-sign-in-link').enabled = allowed;
      if (!allowed) {
        $('create-profile-supervised-indicator').setAttribute('controlled-by',
                                                              'policy');
      } else {
        $('create-profile-supervised-indicator').removeAttribute(
            'controlled-by');
      }
    },

    /**
     * Updates the status of the "create supervised user" checkbox. Called from
     * updateSupervisedUsersAllowed_() or updateCreateInProgress_().
     * updateSignedInStatus_() does not call this method directly, because it
     * will be followed by a call to updateSupervisedUsersAllowed_().
     * @private
     */
    updateCreateSupervisedUserCheckbox_: function() {
      $('create-profile-supervised').disabled =
          !this.supervisedUsersAllowed_ || this.createInProgress_ ||
          this.signedInEmail_ == '' || this.hasError_;
    },
  };

  // Forward public APIs to private implementations.
  cr.makePublic(CreateProfileOverlay, [
    'cancelCreateProfile',
    'onError',
    'onSuccess',
    'onWarning',
    'updateCreateInProgress',
    'updateSignedInStatus',
    'updateSupervisedUsersAllowed',
  ]);

  // Export
  return {
    ManageProfileOverlay: ManageProfileOverlay,
    CreateProfileOverlay: CreateProfileOverlay,
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  var FocusManager = cr.ui.FocusManager;
  var PageManager = cr.ui.pageManager.PageManager;

  function OptionsFocusManager() {
  }

  cr.addSingletonGetter(OptionsFocusManager);

  OptionsFocusManager.prototype = {
    __proto__: FocusManager.prototype,

    /** @override */
    getFocusParent: function() {
      var topPage = PageManager.getTopmostVisiblePage().pageDiv;

      // The default page and search page include a search field that is a
      // sibling of the rest of the page instead of a child. Thus, use the
      // parent node to allow the search field to receive focus.
      if (topPage.parentNode.id == 'page-container')
        return topPage.parentNode;

      return topPage;
    },
  };

  return {
    OptionsFocusManager: OptionsFocusManager,
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /** @const */ var Page = cr.ui.pageManager.Page;
  /** @const */ var PageManager = cr.ui.pageManager.PageManager;
  /** @const */ var ArrayDataModel = cr.ui.ArrayDataModel;

  /////////////////////////////////////////////////////////////////////////////
  // PasswordManager class:

  /**
   * Encapsulated handling of password and exceptions page.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function PasswordManager() {
    this.activeNavTab = null;
    Page.call(this, 'passwords',
              loadTimeData.getString('passwordsPageTabTitle'),
              'password-manager');
  }

  cr.addSingletonGetter(PasswordManager);

  PasswordManager.prototype = {
    __proto__: Page.prototype,

    /**
     * The saved passwords list.
     * @type {options.DeletableItemList}
     * @private
     */
    savedPasswordsList_: null,

    /**
     * The password exceptions list.
     * @type {options.DeletableItemList}
     * @private
     */
    passwordExceptionsList_: null,

    /**
     * The timer id of the timer set on search query change events.
     * @type {number}
     * @private
     */
    queryDelayTimerId_: 0,

    /**
     * The most recent search query, or null if the query is empty.
     * @type {?string}
     * @private
     */
    lastQuery_: null,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      $('auto-signin-block').hidden =
          !loadTimeData.getBoolean('enableCredentialManagerAPI');

      $('password-manager-confirm').onclick = function() {
        PageManager.closeOverlay();
      };

      $('password-search-box').addEventListener('search',
          this.handleSearchQueryChange_.bind(this));

      $('exceptions-learn-more').onclick = function() {
        chrome.send('coreOptionsUserMetricsAction',
                    ['Options_PasswordManagerExceptionsLearnMore']);
        return true;  // Always follow the href
      };

      this.createSavedPasswordsList_();
      this.createPasswordExceptionsList_();
    },

    /** @override */
    canShowPage: function() {
      return !(cr.isChromeOS && UIAccountTweaks.loggedInAsGuest());
    },

    /** @override */
    didShowPage: function() {
      // Updating the password lists may cause a blocking platform dialog pop up
      // (Mac, Linux), so we delay this operation until the page is shown.
      chrome.send('updatePasswordLists');
      $('password-search-box').focus();
    },

    /**
     * Creates, decorates and initializes the saved passwords list.
     * @private
     */
    createSavedPasswordsList_: function() {
      var savedPasswordsList = $('saved-passwords-list');
      options.passwordManager.PasswordsList.decorate(savedPasswordsList);
      this.savedPasswordsList_ = assertInstanceof(savedPasswordsList,
          options.DeletableItemList);
      this.savedPasswordsList_.autoExpands = true;
    },

    /**
     * Creates, decorates and initializes the password exceptions list.
     * @private
     */
    createPasswordExceptionsList_: function() {
      var passwordExceptionsList = $('password-exceptions-list');
      options.passwordManager.PasswordExceptionsList.decorate(
          passwordExceptionsList);
      this.passwordExceptionsList_ = assertInstanceof(passwordExceptionsList,
          options.DeletableItemList);
      this.passwordExceptionsList_.autoExpands = true;
    },

    /**
     * Handles search query changes.
     * @param {!Event} e The event object.
     * @private
     */
    handleSearchQueryChange_: function(e) {
      if (this.queryDelayTimerId_)
        window.clearTimeout(this.queryDelayTimerId_);

      // Searching cookies uses a timeout of 500ms. We use a shorter timeout
      // because there are probably fewer passwords and we want the UI to be
      // snappier since users will expect that it's "less work."
      this.queryDelayTimerId_ = window.setTimeout(
          this.searchPasswords_.bind(this), 250);

      chrome.send('coreOptionsUserMetricsAction',
                  ['Options_PasswordManagerSearch']);
    },

    /**
     * Search passwords using text in |password-search-box|.
     * @private
     */
    searchPasswords_: function() {
      this.queryDelayTimerId_ = 0;
      var filter = $('password-search-box').value;
      filter = (filter == '') ? null : filter;
      if (this.lastQuery_ != filter) {
        this.lastQuery_ = filter;
        // Searching for passwords has the side effect of requerying the
        // underlying password store. This is done intentionally, as on OS X and
        // Linux they can change from outside and we won't be notified of it.
        chrome.send('updatePasswordLists');
      }
    },

    /**
     * Updates the visibility of the list and empty list placeholder.
     * @param {!cr.ui.List} list The list to toggle visilibility for.
     */
    updateListVisibility_: function(list) {
      var empty = list.dataModel.length == 0;
      var listPlaceHolderID = list.id + '-empty-placeholder';
      list.hidden = empty;
      $(listPlaceHolderID).hidden = !empty;
    },

    /**
     * Updates the data model for the saved passwords list with the values from
     * |entries|.
     * @param {!Array} entries The list of saved password data.
     */
    setSavedPasswordsList_: function(entries) {
      if (this.lastQuery_) {
        // Implement password searching here in javascript, rather than in C++.
        // The number of saved passwords shouldn't be too big for us to handle.
        var query = this.lastQuery_;
        var filter = function(entry, index, list) {
          // Search both shown URL and username.
          var shownUrl = entry[options.passwordManager.SHOWN_URL_FIELD];
          var username = entry[options.passwordManager.USERNAME_FIELD];
          if (shownUrl.toLowerCase().indexOf(query.toLowerCase()) >= 0 ||
              username.toLowerCase().indexOf(query.toLowerCase()) >= 0) {
            // Keep the original index so we can delete correctly. See also
            // deleteItemAtIndex() in password_manager_list.js that uses this.
            entry[options.passwordManager.ORIGINAL_INDEX_FIELD] = index;
            return true;
          }
          return false;
        };
        entries = entries.filter(filter);
      }
      this.savedPasswordsList_.dataModel = new ArrayDataModel(entries);
      this.updateListVisibility_(this.savedPasswordsList_);
    },

    /**
     * Updates the data model for the password exceptions list with the values
     * from |entries|.
     * @param {!Array} entries The list of password exception data.
     */
    setPasswordExceptionsList_: function(entries) {
      this.passwordExceptionsList_.dataModel = new ArrayDataModel(entries);
      this.updateListVisibility_(this.passwordExceptionsList_);
    },

    /**
     * Reveals the password for a saved password entry. This is called by the
     * backend after it has authenticated the user.
     * @param {number} index The original index of the entry in the model.
     * @param {string} password The saved password.
     */
    showPassword_: function(index, password) {
      var model = this.savedPasswordsList_.dataModel;
      if (this.lastQuery_) {
        // When a filter is active, |index| does not represent the current
        // index in the model, but each entry stores its original index, so
        // we can find the item using a linear search.
        for (var i = 0; i < model.length; ++i) {
          if (model.item(i)[options.passwordManager.ORIGINAL_INDEX_FIELD] ==
              index) {
            index = i;
            break;
          }
        }
      }

      // Reveal the password in the UI.
      var item = this.savedPasswordsList_.getListItemByIndex(index);
      item.showPassword(password);
    },
  };

  /**
   * Removes a saved password.
   * @param {number} rowIndex indicating the row to remove.
   */
  PasswordManager.removeSavedPassword = function(rowIndex) {
      chrome.send('removeSavedPassword', [String(rowIndex)]);
      chrome.send('coreOptionsUserMetricsAction',
                  ['Options_PasswordManagerDeletePassword']);
  };

  /**
   * Removes a password exception.
   * @param {number} rowIndex indicating the row to remove.
   */
  PasswordManager.removePasswordException = function(rowIndex) {
      chrome.send('removePasswordException', [String(rowIndex)]);
  };

  PasswordManager.requestShowPassword = function(index) {
    chrome.send('requestShowPassword', [index]);
  };

  // Forward public APIs to private implementations on the singleton instance.
  cr.makePublic(PasswordManager, [
    'setSavedPasswordsList',
    'setPasswordExceptionsList',
    'showPassword'
  ]);

  // Export
  return {
    PasswordManager: PasswordManager
  };

});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options.passwordManager', function() {
  /** @const */ var ArrayDataModel = cr.ui.ArrayDataModel;
  /** @const */ var DeletableItemList = options.DeletableItemList;
  /** @const */ var DeletableItem = options.DeletableItem;
  /** @const */ var List = cr.ui.List;

  // The following constants should be synchronized with the constants in
  // chrome/browser/ui/webui/options/password_manager_handler.cc.
  /** @const */ var ORIGIN_FIELD = 'origin';
  /** @const */ var SHOWN_URL_FIELD = 'shownUrl';
  /** @const */ var IS_ANDROID_URI_FIELD = 'isAndroidUri';
  /** @const */ var IS_SECURE_FIELD = 'isSecure';
  /** @const */ var USERNAME_FIELD = 'username';
  /** @const */ var PASSWORD_FIELD = 'password';
  /** @const */ var FEDERATION_FIELD = 'federation';
  /** @const */ var ORIGINAL_INDEX_FIELD = 'index';

  /**
   * Creates a new passwords list item.
   * @param {cr.ui.ArrayDataModel} dataModel The data model that contains this
   *     item.
   * @param {Object} entry A dictionary of data on new list item. When the
   *     list has been filtered, one more element [index] may be present.
   * @param {boolean} showPasswords If true, add a button to the element to
   *     allow the user to reveal the saved password.
   * @constructor
   * @extends {options.DeletableItem}
   */
  function PasswordListItem(dataModel, entry, showPasswords) {
    var el = cr.doc.createElement('div');
    el.dataItem = entry;
    el.dataModel = dataModel;
    el.__proto__ = PasswordListItem.prototype;
    el.showPasswords_ = showPasswords;
    el.decorate();

    return el;
  }

  /**
   * Returns title for password's origin. If the origin is  Android URI, returns
   * the origin as it is. Removes the scheme if the url is insecure and removes
   * trailing punctuation symbols.
   * @param {Object} item A dictionary of data on the list item.
   * @return {string} The title for password's origin.
   */
  function getTitleForPasswordOrigin(item) {
    var title = item.url;
    if (item.isAndroidUri)
      return title;
    if (!item.isSecure) {
      var ind = title.indexOf('://');
      if (ind >= 0) {
        title = title.substring(ind + 3);
      }
    }
    // Since the direction is switched to RTL, punctuation symbols appear on the
    // left side, that is wrong. So, just remove trailing punctuation symbols.
    title = title.replace(/[^A-Za-z0-9]+$/, '');
    return title;
  }

  /**
   * Helper function that creates an HTML element for displaying the origin of
   * saved password.
   * @param {Object} item A dictionary of data on the list item.
   * @param {Element} urlDiv div-element that will enclose the created
   *     element.
   * @return {Element} The element for displaying password origin.
   */
  function createUrlLink(item, urlDiv) {
    var urlLink;
    if (!item.isAndroidUri) {
      urlLink = item.ownerDocument.createElement('a');
      urlLink.href = item.url;
      urlLink.setAttribute('target', '_blank');
      urlLink.textContent = item.shownUrl.split('').reverse().join('');

      urlDiv.classList.add('left-elided-url');
    } else {
      urlLink = item.ownerDocument.createElement('span');
      urlLink.textContent = item.shownUrl;
    }
    urlLink.addEventListener('focus', function() {
      item.handleFocus();
    }.bind(item));
    return urlLink;
  }

  PasswordListItem.prototype = {
    __proto__: DeletableItem.prototype,

    /** @override */
    decorate: function() {
      DeletableItem.prototype.decorate.call(this);

      // The URL of the site.
      var urlDiv = this.ownerDocument.createElement('div');
      urlDiv.className = 'favicon-cell url';
      urlDiv.setAttribute('title', getTitleForPasswordOrigin(this));
      urlDiv.style.backgroundImage = getFaviconImageSet(
          'origin/' + this.url, 16);

      this.urlLink = createUrlLink(this, urlDiv);
      urlDiv.appendChild(this.urlLink);

      this.contentElement.appendChild(urlDiv);

      // The stored username.
      var usernameDiv = this.ownerDocument.createElement('div');
      usernameDiv.className = 'name';
      usernameDiv.title = this.username;
      this.contentElement.appendChild(usernameDiv);
      var usernameInput = this.ownerDocument.createElement('input');
      usernameInput.type = 'text';
      usernameInput.className = 'inactive-item';
      usernameInput.readOnly = true;
      usernameInput.value = this.username;
      usernameInput.addEventListener('focus', function() {
        this.handleFocus();
      }.bind(this));
      usernameDiv.appendChild(usernameInput);
      this.usernameField = usernameInput;

      if (this.federation) {
        // The federation.
        var federationDiv = this.ownerDocument.createElement('div');
        federationDiv.className = 'federation';
        federationDiv.textContent = this.federation;
        federationDiv.title = this.federation;
        this.contentElement.appendChild(federationDiv);
      } else {
        // The stored password.
        var passwordInputDiv = this.ownerDocument.createElement('div');
        passwordInputDiv.className = 'password';

        // The password input field.
        var passwordInput = this.ownerDocument.createElement('input');
        passwordInput.type = 'password';
        passwordInput.className = 'inactive-item';
        passwordInput.readOnly = true;
        passwordInput.value = this.showPasswords_ ? this.password : '********';
        passwordInputDiv.appendChild(passwordInput);
        passwordInput.addEventListener('focus', function() {
          this.handleFocus();
        }.bind(this));
        this.passwordField = passwordInput;

        // The show/hide button.
        if (this.showPasswords_) {
          var button = this.ownerDocument.createElement('button');
          button.hidden = true;
          button.className = 'list-inline-button custom-appearance';
          button.textContent = loadTimeData.getString('passwordShowButton');
          button.addEventListener('click', this.onClick_.bind(this), true);
          button.addEventListener('mousedown', function(event) {
            // Don't focus on this button by mousedown.
            event.preventDefault();
            // Don't handle list item selection. It causes focus change.
            event.stopPropagation();
          }, false);
          button.addEventListener('focus', function() {
            this.handleFocus();
          }.bind(this));
          passwordInputDiv.appendChild(button);
          this.passwordShowButton = button;
        }
        this.contentElement.appendChild(passwordInputDiv);
      }
      this.setFocusable_(false);
    },

    /** @override */
    selectionChanged: function() {
      var usernameInput = this.usernameField;
      var passwordInput = this.passwordField;
      var button = this.passwordShowButton;

      this.setFocusable_(this.selected);

      if (this.selected) {
        usernameInput.classList.remove('inactive-item');
        if (button) {
          passwordInput.classList.remove('inactive-item');
          button.hidden = false;
          passwordInput.focus();
        } else {
          usernameInput.focus();
        }
      } else {
        usernameInput.classList.add('inactive-item');
        if (button) {
          passwordInput.classList.add('inactive-item');
          button.hidden = true;
        }
      }
    },

    /**
     * Set the focusability of this row.
     * @param {boolean} focusable
     * @private
     */
    setFocusable_: function(focusable) {
      var tabIndex = focusable ? 0 : -1;
      this.urlLink.tabIndex = tabIndex;
      this.usernameField.tabIndex = tabIndex;
      this.closeButtonElement.tabIndex = tabIndex;
      if (this.passwordShowButton)
        this.passwordField.tabIndex = tabIndex;
    },

    /**
     * Reveals the plain text password of this entry.
     */
    showPassword: function(password) {
      this.passwordField.value = password;
      this.passwordField.type = 'text';

      var button = this.passwordShowButton;
      if (button)
        button.textContent = loadTimeData.getString('passwordHideButton');
    },

    /**
     * Hides the plain text password of this entry.
     */
    hidePassword: function() {
      this.passwordField.type = 'password';

      var button = this.passwordShowButton;
      if (button)
        button.textContent = loadTimeData.getString('passwordShowButton');
    },

    /**
     * Get the original index of this item in the data model.
     * @return {number} The index.
     * @private
     */
    getOriginalIndex_: function() {
      var index = this.dataItem[ORIGINAL_INDEX_FIELD];
      return index ? index : this.dataModel.indexOf(this.dataItem);
    },

    /**
     * On-click event handler. Swaps the type of the input field from password
     * to text and back.
     * @private
     */
    onClick_: function(event) {
      if (this.passwordField.type == 'password') {
        // After the user is authenticated, showPassword() will be called.
        PasswordManager.requestShowPassword(this.getOriginalIndex_());
      } else {
        this.hidePassword();
      }
    },

    /**
     * Get and set the URL for the entry.
     * @type {string}
     */
    get url() {
      return this.dataItem[ORIGIN_FIELD];
    },
    set url(url) {
      this.dataItem[ORIGIN_FIELD] = url;
    },

    /**
     * Get and set the shown url for the entry.
     * @type {string}
     */
    get shownUrl() {
      return this.dataItem[SHOWN_URL_FIELD];
    },
    set shownUrl(shownUrl) {
      this.dataItem[SHOWN_URL_FIELD] = shownUrl;
    },

    /**
     * Get and set whether the origin is Android URI.
     * @type {boolean}
     */
    get isAndroidUri() {
      return this.dataItem[IS_ANDROID_URI_FIELD];
    },
    set isAndroidUri(isAndroidUri) {
      this.dataItem[IS_ANDROID_URI_FIELD] = isAndroidUri;
    },

    /**
     * Get and set whether the origin uses secure scheme.
     * @type {boolean}
     */
    get isSecure() {
      return this.dataItem[IS_SECURE_FIELD];
    },
    set isSecure(isSecure) {
      this.dataItem[IS_SECURE_FIELD] = isSecure;
    },

    /**
     * Get and set the username for the entry.
     * @type {string}
     */
    get username() {
      return this.dataItem[USERNAME_FIELD];
    },
    set username(username) {
      this.dataItem[USERNAME_FIELD] = username;
    },

    /**
     * Get and set the password for the entry.
     * @type {string}
     */
    get password() {
      return this.dataItem[PASSWORD_FIELD];
    },
    set password(password) {
      this.dataItem[PASSWORD_FIELD] = password;
    },

    /**
     * Get and set the federation for the entry.
     * @type {string}
     */
    get federation() {
      return this.dataItem[FEDERATION_FIELD];
    },
    set federation(federation) {
      this.dataItem[FEDERATION_FIELD] = federation;
    },
  };

  /**
   * Creates a new PasswordExceptions list item.
   * @param {Object} entry A dictionary of data on new list item.
   * @constructor
   * @extends {options.DeletableItem}
   */
  function PasswordExceptionsListItem(entry) {
    var el = cr.doc.createElement('div');
    el.dataItem = entry;
    el.__proto__ = PasswordExceptionsListItem.prototype;
    el.decorate();

    return el;
  }

  PasswordExceptionsListItem.prototype = {
    __proto__: DeletableItem.prototype,

    /**
     * Call when an element is decorated as a list item.
     */
    decorate: function() {
      DeletableItem.prototype.decorate.call(this);

      // The URL of the site.
      var urlDiv = this.ownerDocument.createElement('div');
      urlDiv.className = 'favicon-cell url';
      urlDiv.setAttribute('title', getTitleForPasswordOrigin(this));
      urlDiv.style.backgroundImage = getFaviconImageSet(
        'origin/' + this.url, 16);

      this.urlLink = createUrlLink(this, urlDiv);
      urlDiv.appendChild(this.urlLink);

      this.contentElement.appendChild(urlDiv);
    },

    /** @override */
    selectionChanged: function() {
      if (this.selected) {
        this.setFocusable_(true);
        this.urlLink.focus();
      } else {
        this.setFocusable_(false);
      }
    },

    /**
     * Set the focusability of this row.
     * @param {boolean} focusable
     * @private
     */
    setFocusable_: function(focusable) {
      var tabIndex = focusable ? 0 : -1;
      this.urlLink.tabIndex = tabIndex;
      this.closeButtonElement.tabIndex = tabIndex;
    },

    /**
     * Get the url for the entry.
     * @type {string}
     */
    get url() {
      return this.dataItem[ORIGIN_FIELD];
    },
    set url(url) {
      this.dataItem[ORIGIN_FIELD] = url;
    },

    /**
     * Get and set the shown url for the entry.
     * @type {string}
     */
    get shownUrl() {
      return this.dataItem[SHOWN_URL_FIELD];
    },
    set shownUrl(shownUrl) {
      this.dataItem[SHOWN_URL_FIELD] = shownUrl;
    },

    /**
     * Get and set whether the origin is Android URI.
     * @type {boolean}
     */
    get isAndroidUri() {
      return this.dataItem[IS_ANDROID_URI_FIELD];
    },
    set isAndroidUri(isAndroidUri) {
      this.dataItem[IS_ANDROID_URI_FIELD] = isAndroidUri;
    },

    /**
     * Get and set whether the origin uses secure scheme.
     * @type {boolean}
     */
    get isSecure() {
      return this.dataItem[IS_SECURE_FIELD];
    },
    set isSecure(isSecure) {
      this.dataItem[IS_SECURE_FIELD] = isSecure;
    },
  };

  /**
   * Create a new passwords list.
   * @constructor
   * @extends {options.DeletableItemList}
   */
  var PasswordsList = cr.ui.define('list');

  PasswordsList.prototype = {
    __proto__: DeletableItemList.prototype,

    /**
     * Whether passwords can be revealed or not.
     * @type {boolean}
     * @private
     */
    showPasswords_: true,

    /** @override */
    decorate: function() {
      DeletableItemList.prototype.decorate.call(this);
      Preferences.getInstance().addEventListener(
          'profile.password_manager_allow_show_passwords',
          this.onPreferenceChanged_.bind(this));
      this.addEventListener('focus', this.onFocus_.bind(this));
    },

    /**
     * Listener for changes on the preference.
     * @param {Event} event The preference update event.
     * @private
     */
    onPreferenceChanged_: function(event) {
      this.showPasswords_ = event.value.value;
      this.redraw();
    },

    /**
     * @override
     * @param {Array} entry
     */
    createItem: function(entry) {
      var showPasswords = this.showPasswords_;

      if (loadTimeData.getBoolean('disableShowPasswords'))
        showPasswords = false;

      return new PasswordListItem(this.dataModel, entry, showPasswords);
    },

    /** @override */
    deleteItemAtIndex: function(index) {
      var item = this.dataModel.item(index);
      if (item && item[ORIGINAL_INDEX_FIELD] != undefined) {
        // The fifth element, if present, is the original index to delete.
        index = item[ORIGINAL_INDEX_FIELD];
      }
      PasswordManager.removeSavedPassword(index);
    },

    /**
     * The length of the list.
     */
    get length() {
      return this.dataModel.length;
    },

    /**
     * Will make to first row focusable if none are selected. This makes it
     * possible to tab into the rows without pressing up/down first.
     * @param {Event} e The focus event.
     * @private
     */
    onFocus_: function(e) {
      if (!this.selectedItem && this.items)
        this.items[0].setFocusable_(true);
    },
  };

  /**
   * Create a new passwords list.
   * @constructor
   * @extends {options.DeletableItemList}
   */
  var PasswordExceptionsList = cr.ui.define('list');

  PasswordExceptionsList.prototype = {
    __proto__: DeletableItemList.prototype,

    /**
     * @override
     * @param {Array} entry
     */
    createItem: function(entry) {
      return new PasswordExceptionsListItem(entry);
    },

    /** @override */
    deleteItemAtIndex: function(index) {
      PasswordManager.removePasswordException(index);
    },

    /**
     * The length of the list.
     */
    get length() {
      return this.dataModel.length;
    },
  };

  return {
    PasswordListItem: PasswordListItem,
    PasswordExceptionsListItem: PasswordExceptionsListItem,
    PasswordsList: PasswordsList,
    PasswordExceptionsList: PasswordExceptionsList,
    ORIGIN_FIELD: ORIGIN_FIELD,
    SHOWN_URL_FIELD: SHOWN_URL_FIELD,
    IS_SECURE_FIELD: IS_SECURE_FIELD,
    USERNAME_FIELD: USERNAME_FIELD,
    PASSWORD_FIELD: PASSWORD_FIELD,
    FEDERATION_FIELD: FEDERATION_FIELD,
    ORIGINAL_INDEX_FIELD: ORIGINAL_INDEX_FIELD
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /** @const */ var ListItem = cr.ui.ListItem;
  /** @const */ var Grid = cr.ui.Grid;
  /** @const */ var ListSingleSelectionModel = cr.ui.ListSingleSelectionModel;

  /**
   * Creates a new profile icon grid item.
   * @param {Object} iconURL The profile icon URL.
   * @constructor
   * @extends {cr.ui.GridItem}
   */
  function ProfilesIconGridItem(iconURL) {
    var el = cr.doc.createElement('span');
    el.iconURL_ = iconURL;
    ProfilesIconGridItem.decorate(el);
    return el;
  }

  /**
   * Decorates an element as a profile grid item.
   * @param {!HTMLElement} el The element to decorate.
   */
  ProfilesIconGridItem.decorate = function(el) {
    el.__proto__ = ProfilesIconGridItem.prototype;
    el.decorate();
  };

  ProfilesIconGridItem.prototype = {
    __proto__: ListItem.prototype,

    /** @override */
    decorate: function() {
      ListItem.prototype.decorate.call(this);
      var imageEl = cr.doc.createElement('img');
      imageEl.className = 'profile-icon';
      imageEl.style.content = getProfileAvatarIcon(this.iconURL_);
      this.appendChild(imageEl);

      this.className = 'profile-icon-grid-item';
    },
  };

  var ProfilesIconGrid = cr.ui.define('grid');

  ProfilesIconGrid.prototype = {
    __proto__: Grid.prototype,

    /** @override */
    decorate: function() {
      Grid.prototype.decorate.call(this);
      this.selectionModel = new ListSingleSelectionModel();
    },

    /** @override */
    createItem: function(iconURL) {
      return new ProfilesIconGridItem(iconURL);
    },
  };

  return {
    ProfilesIconGrid: ProfilesIconGrid
  };
});

// Copyright 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  var Page = cr.ui.pageManager.Page;

  var AutomaticSettingsResetBanner = options.AutomaticSettingsResetBanner;

  /**
   * ResetProfileSettingsOverlay class
   * Encapsulated handling of the 'Reset Profile Settings' overlay page.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function ResetProfileSettingsOverlay() {
    Page.call(this, 'resetProfileSettings',
              loadTimeData.getString('resetProfileSettingsOverlayTabTitle'),
              'reset-profile-settings-overlay');
  }

  cr.addSingletonGetter(ResetProfileSettingsOverlay);

  ResetProfileSettingsOverlay.prototype = {
    // Inherit ResetProfileSettingsOverlay from Page.
    __proto__: Page.prototype,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      $('reset-profile-settings-dismiss').onclick = function(e) {
        ResetProfileSettingsOverlay.dismiss();
      };
      $('reset-profile-settings-commit').onclick = function(e) {
        ResetProfileSettingsOverlay.setResettingState(true);
        chrome.send('performResetProfileSettings',
                    [$('send-settings').checked]);
      };
      $('expand-feedback').onclick = function(e) {
        var feedbackTemplate = $('feedback-template');
        feedbackTemplate.hidden = !feedbackTemplate.hidden;
        e.preventDefault();
      };
    },

    /**
     * @override
     * @suppress {checkTypes}
     * TODO(vitalyp): remove the suppression. See the explanation in
     * chrome/browser/resources/options/automatic_settings_reset_banner.js.
     */
    didShowPage: function() {
      $('reset-profile-settings-title').textContent =
          loadTimeData.getString('resetProfileSettingsOverlay');
      $('reset-profile-settings-explanation').textContent =
          loadTimeData.getString('resetProfileSettingsExplanation');

      chrome.send('onShowResetProfileDialog');
    },

    /** @override */
    didClosePage: function() {
      chrome.send('onHideResetProfileDialog');
    },
  };

  /**
   * Enables/disables UI elements after/while Chrome is performing a reset.
   * @param {boolean} state If true, UI elements are disabled.
   */
  ResetProfileSettingsOverlay.setResettingState = function(state) {
    $('reset-profile-settings-throbber').style.visibility =
        state ? 'visible' : 'hidden';
    $('reset-profile-settings-dismiss').disabled = state;
    $('reset-profile-settings-commit').disabled = state;
  };

  /**
   * Chrome callback to notify ResetProfileSettingsOverlay that the reset
   * operation has terminated.
   * @suppress {checkTypes}
   * TODO(vitalyp): remove the suppression. See the explanation in
   * chrome/browser/resources/options/automatic_settings_reset_banner.js.
   */
  ResetProfileSettingsOverlay.doneResetting = function() {
    AutomaticSettingsResetBanner.dismiss();
    ResetProfileSettingsOverlay.dismiss();
  };

  /**
   * Dismisses the overlay.
   */
  ResetProfileSettingsOverlay.dismiss = function() {
    PageManager.closeOverlay();
    ResetProfileSettingsOverlay.setResettingState(false);
  };

  ResetProfileSettingsOverlay.setFeedbackInfo = function(feedbackListData) {
    var input = new JsEvalContext(feedbackListData);
    var output = $('feedback-template');
    jstProcess(input, output);
  };

  // Export
  return {
    ResetProfileSettingsOverlay: ResetProfileSettingsOverlay
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /** @const */ var Page = cr.ui.pageManager.Page;
  /** @const */ var PageManager = cr.ui.pageManager.PageManager;
  /** @const */ var ArrayDataModel = cr.ui.ArrayDataModel;

  /**
   * Encapsulated handling of search engine management page.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function SearchEngineManager() {
    this.activeNavTab = null;
    Page.call(this, 'searchEngines',
              loadTimeData.getString('searchEngineManagerPageTabTitle'),
              'search-engine-manager-page');
  }

  cr.addSingletonGetter(SearchEngineManager);

  SearchEngineManager.prototype = {
    __proto__: Page.prototype,

    /**
     * List for default search engine options.
     * @private
     */
    defaultsList_: null,

    /**
     * List for other search engine options.
     * @private
     */
    othersList_: null,

    /**
     * List for extension keywords.
     * @private
     */
    extensionList_: null,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      this.defaultsList_ = $('default-search-engine-list');
      this.setUpList_(this.defaultsList_);

      this.othersList_ = $('other-search-engine-list');
      this.setUpList_(this.othersList_);

      this.extensionList_ = $('extension-keyword-list');
      this.setUpList_(this.extensionList_);

      $('search-engine-manager-confirm').onclick = function() {
        PageManager.closeOverlay();
      };
    },

    /**
     * Sets up the given list as a search engine list
     * @param {HTMLElement} list The list to set up.
     * @private
     */
    setUpList_: function(list) {
      options.search_engines.SearchEngineList.decorate(list);
      list.autoExpands = true;
    },

    /**
     * Updates the search engine list with the given entries.
     * @private
     * @param {!Array} defaultEngines List of possible default search engines.
     * @param {!Array} otherEngines List of other search engines.
     * @param {!Array} keywords List of keywords from extensions.
     */
    updateSearchEngineList_: function(defaultEngines, otherEngines, keywords) {
      this.defaultsList_.dataModel = new ArrayDataModel(defaultEngines);

      otherEngines = otherEngines.map(function(x) {
        return [x, x.name.toLocaleLowerCase()];
      }).sort(function(a, b) {
        return a[1].localeCompare(b[1]);
      }).map(function(x) {
        return x[0];
      });

      var othersModel = new ArrayDataModel(otherEngines);
      // Add a "new engine" row.
      othersModel.push({
        'modelIndex': '-1',
        'canBeEdited': true
      });
      this.othersList_.dataModel = othersModel;

      if (keywords.length > 0) {
        $('extension-keyword-div').hidden = false;
        var extensionsModel = new ArrayDataModel(keywords);
        this.extensionList_.dataModel = extensionsModel;
      } else {
        $('extension-keyword-div').hidden = true;
      }
    },
  };

  SearchEngineManager.updateSearchEngineList = function(defaultEngines,
                                                        otherEngines,
                                                        keywords) {
    SearchEngineManager.getInstance().updateSearchEngineList_(defaultEngines,
                                                              otherEngines,
                                                              keywords);
  };

  SearchEngineManager.validityCheckCallback = function(validity, modelIndex) {
    // Forward to all lists; those without a matching modelIndex will ignore it.
    SearchEngineManager.getInstance().defaultsList_.validationComplete(
        validity, modelIndex);
    SearchEngineManager.getInstance().othersList_.validationComplete(
        validity, modelIndex);
    SearchEngineManager.getInstance().extensionList_.validationComplete(
        validity, modelIndex);
  };

  // Export
  return {
    SearchEngineManager: SearchEngineManager
  };

});


// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @typedef {{canBeDefault: boolean,
 *            canBeEdited: boolean,
 *            canBeRemoved: boolean,
 *            default: boolean,
 *            displayName: string,
 *            extension: (Object|undefined),
 *            iconURL: (string|undefined),
 *            isOmniboxExtension: boolean,
 *            keyword: string,
 *            modelIndex: string,
 *            name: string,
 *            url: string,
 *            urlLocked: boolean}}
 * @see chrome/browser/ui/webui/options/search_engine_manager_handler.cc
 */
var SearchEngine;

cr.define('options.search_engines', function() {
  /** @const */ var ControlledSettingIndicator =
                    options.ControlledSettingIndicator;
  /** @const */ var InlineEditableItemList = options.InlineEditableItemList;
  /** @const */ var InlineEditableItem = options.InlineEditableItem;
  /** @const */ var ListSelectionController = cr.ui.ListSelectionController;

  /**
   * Creates a new search engine list item.
   * @param {SearchEngine} searchEngine The search engine this represents.
   * @constructor
   * @extends {options.InlineEditableItem}
   */
  function SearchEngineListItem(searchEngine) {
    var el = cr.doc.createElement('div');
    el.searchEngine_ = searchEngine;
    SearchEngineListItem.decorate(el);
    return el;
  }

  /**
   * Decorates an element as a search engine list item.
   * @param {!HTMLElement} el The element to decorate.
   */
  SearchEngineListItem.decorate = function(el) {
    el.__proto__ = SearchEngineListItem.prototype;
    el.decorate();
  };

  SearchEngineListItem.prototype = {
    __proto__: InlineEditableItem.prototype,

    /**
     * Input field for editing the engine name.
     * @type {HTMLElement}
     * @private
     */
    nameField_: null,

    /**
     * Input field for editing the engine keyword.
     * @type {HTMLElement}
     * @private
     */
    keywordField_: null,

    /**
     * Input field for editing the engine url.
     * @type {HTMLElement}
     * @private
     */
    urlField_: null,

    /**
     * Whether or not an input validation request is currently outstanding.
     * @type {boolean}
     * @private
     */
    waitingForValidation_: false,

    /**
     * Whether or not the current set of input is known to be valid.
     * @type {boolean}
     * @private
     */
    currentlyValid_: false,

    /**
     * @type {?SearchEngine}
     */
    searchEngine_: null,

    /** @override */
    decorate: function() {
      InlineEditableItem.prototype.decorate.call(this);

      var engine = this.searchEngine_;

      if (engine.modelIndex == '-1') {
        this.isPlaceholder = true;
        engine.name = '';
        engine.keyword = '';
        engine.url = '';
      }

      this.currentlyValid_ = !this.isPlaceholder;

      if (engine.default)
        this.classList.add('default');

      this.deletable = engine.canBeRemoved;
      this.closeButtonFocusAllowed = true;

      // Construct the name column.
      var nameColEl = this.ownerDocument.createElement('div');
      nameColEl.className = 'name-column';
      nameColEl.classList.add('weakrtl');
      this.contentElement.appendChild(nameColEl);

      // Add the favicon.
      var faviconDivEl = this.ownerDocument.createElement('div');
      faviconDivEl.className = 'favicon';
      if (!this.isPlaceholder) {
        faviconDivEl.style.backgroundImage = imageset(
            'http://chromesettings.github.io/favicon/size/16@scalefactorx/iconurl/' + engine.iconURL);
      }
      nameColEl.appendChild(faviconDivEl);

      var nameEl = this.createEditableTextCell(engine.displayName);
      nameEl.classList.add('weakrtl');
      nameColEl.appendChild(nameEl);

      // Then the keyword column.
      var keywordEl = this.createEditableTextCell(engine.keyword);
      keywordEl.className = 'keyword-column';
      keywordEl.classList.add('weakrtl');
      this.contentElement.appendChild(keywordEl);

      // And the URL column.
      var urlEl = this.createEditableTextCell(engine.url);
      var makeDefaultButtonEl = null;
      // Extensions should not display a URL column.
      if (!engine.isOmniboxExtension) {
        var urlWithButtonEl = this.ownerDocument.createElement('div');
        urlWithButtonEl.appendChild(urlEl);
        urlWithButtonEl.className = 'url-column';
        urlWithButtonEl.classList.add('weakrtl');
        this.contentElement.appendChild(urlWithButtonEl);
        // Add the Make Default button. Temporary until drag-and-drop
        // re-ordering is implemented. When this is removed, remove the extra
        // div above.
        if (engine.canBeDefault) {
          makeDefaultButtonEl = this.ownerDocument.createElement('button');
          makeDefaultButtonEl.className =
              'custom-appearance list-inline-button';
          makeDefaultButtonEl.textContent =
              loadTimeData.getString('makeDefaultSearchEngineButton');
          makeDefaultButtonEl.onclick = function(e) {
            chrome.send('managerSetDefaultSearchEngine', [engine.modelIndex]);
          };
          makeDefaultButtonEl.onmousedown = function(e) {
            // Don't select the row when clicking the button.
            e.stopPropagation();
            // Don't focus on the button.
            e.preventDefault();
          };
          urlWithButtonEl.appendChild(makeDefaultButtonEl);
        }
      }

      // Do final adjustment to the input fields.
      this.nameField_ = /** @type {HTMLElement} */(
          nameEl.querySelector('input'));
      // The editable field uses the raw name, not the display name.
      this.nameField_.value = engine.name;
      this.keywordField_ = /** @type {HTMLElement} */(
          keywordEl.querySelector('input'));
      this.urlField_ = /** @type {HTMLElement} */(urlEl.querySelector('input'));

      if (engine.urlLocked)
        this.urlField_.disabled = true;

      if (this.isPlaceholder) {
        this.nameField_.placeholder =
            loadTimeData.getString('searchEngineTableNamePlaceholder');
        this.keywordField_.placeholder =
            loadTimeData.getString('searchEngineTableKeywordPlaceholder');
        this.urlField_.placeholder =
            loadTimeData.getString('searchEngineTableURLPlaceholder');
      }

      this.setFocusableColumnIndex(this.nameField_, 0);
      this.setFocusableColumnIndex(this.keywordField_, 1);
      this.setFocusableColumnIndex(this.urlField_, 2);
      this.setFocusableColumnIndex(makeDefaultButtonEl, 3);
      this.setFocusableColumnIndex(this.closeButtonElement, 4);

      var fields = [this.nameField_, this.keywordField_, this.urlField_];
        for (var i = 0; i < fields.length; i++) {
        fields[i].oninput = this.startFieldValidation_.bind(this);
      }

      // Listen for edit events.
      if (engine.canBeEdited) {
        this.addEventListener('edit', this.onEditStarted_.bind(this));
        this.addEventListener('canceledit', this.onEditCancelled_.bind(this));
        this.addEventListener('commitedit', this.onEditCommitted_.bind(this));
      } else {
        this.editable = false;
        this.querySelector('.row-delete-button').hidden = true;
        var indicator = new ControlledSettingIndicator();
        indicator.setAttribute('setting', 'search-engine');
        // Create a synthetic pref change event decorated as
        // CoreOptionsHandler::CreateValueForPref() does.
        var event = new Event(this.contentType);
        if (engine.extension) {
          event.value = { controlledBy: 'extension',
                          extension: engine.extension };
        } else {
          event.value = { controlledBy: 'policy' };
        }
        indicator.handlePrefChange(event);
        this.appendChild(indicator);
      }
    },

    /** @override */
    get currentInputIsValid() {
      return !this.waitingForValidation_ && this.currentlyValid_;
    },

    /** @override */
    get hasBeenEdited() {
      var engine = this.searchEngine_;
      return this.nameField_.value != engine.name ||
             this.keywordField_.value != engine.keyword ||
             this.urlField_.value != engine.url;
    },

    /**
     * Called when entering edit mode; starts an edit session in the model.
     * @param {Event} e The edit event.
     * @private
     */
    onEditStarted_: function(e) {
      var editIndex = this.searchEngine_.modelIndex;
      chrome.send('editSearchEngine', [String(editIndex)]);
      this.startFieldValidation_();
    },

    /**
     * Called when committing an edit; updates the model.
     * @param {Event} e The end event.
     * @private
     */
    onEditCommitted_: function(e) {
      chrome.send('searchEngineEditCompleted', this.getInputFieldValues_());
    },

    /**
     * Called when cancelling an edit; informs the model and resets the control
     * states.
     * @param {Event} e The cancel event.
     * @private
     */
    onEditCancelled_: function(e) {
      chrome.send('searchEngineEditCancelled');

      // The name field has been automatically set to match the display name,
      // but it should use the raw name instead.
      this.nameField_.value = this.searchEngine_.name;
      this.currentlyValid_ = !this.isPlaceholder;
    },

    /**
     * Returns the input field values as an array suitable for passing to
     * chrome.send. The order of the array is important.
     * @private
     * @return {Array} The current input field values.
     */
    getInputFieldValues_: function() {
      return [this.nameField_.value,
              this.keywordField_.value,
              this.urlField_.value];
    },

    /**
     * Begins the process of asynchronously validing the input fields.
     * @private
     */
    startFieldValidation_: function() {
      this.waitingForValidation_ = true;
      var args = this.getInputFieldValues_();
      args.push(this.searchEngine_.modelIndex);
      chrome.send('checkSearchEngineInfoValidity', args);
    },

    /**
     * Callback for the completion of an input validition check.
     * @param {Object} validity A dictionary of validitation results.
     */
    validationComplete: function(validity) {
      this.waitingForValidation_ = false;
      if (validity.name) {
        this.nameField_.setCustomValidity('');
      } else {
        this.nameField_.setCustomValidity(
            loadTimeData.getString('editSearchEngineInvalidTitleToolTip'));
      }

      if (validity.keyword) {
        this.keywordField_.setCustomValidity('');
      } else {
        this.keywordField_.setCustomValidity(
            loadTimeData.getString('editSearchEngineInvalidKeywordToolTip'));
      }

      if (validity.url) {
        this.urlField_.setCustomValidity('');
      } else {
        this.urlField_.setCustomValidity(
            loadTimeData.getString('editSearchEngineInvalidURLToolTip'));
      }

      this.currentlyValid_ = validity.name && validity.keyword && validity.url;
    },
  };

  /**
   * @constructor
   * @extends {options.InlineEditableItemList}
   */
  var SearchEngineList = cr.ui.define('list');

  SearchEngineList.prototype = {
    __proto__: InlineEditableItemList.prototype,

    /**
     * @override
     * @param {SearchEngine} searchEngine
     */
    createItem: function(searchEngine) {
      return new SearchEngineListItem(searchEngine);
    },

    /** @override */
    deleteItemAtIndex: function(index) {
      var modelIndex = this.dataModel.item(index).modelIndex;
      chrome.send('removeSearchEngine', [String(modelIndex)]);
    },

    /**
     * Passes the results of an input validation check to the requesting row
     * if it's still being edited.
     * @param {number} modelIndex The model index of the item that was checked.
     * @param {Object} validity A dictionary of validitation results.
     */
    validationComplete: function(validity, modelIndex) {
      // If it's not still being edited, it no longer matters.
      var currentSelection = this.selectedItem;
      if (!currentSelection)
        return;
      var listItem = this.getListItem(currentSelection);
      if (listItem.editing && currentSelection.modelIndex == modelIndex)
        listItem.validationComplete(validity);
    },
  };

  // Export
  return {
    SearchEngineList: SearchEngineList
  };

});


// Copyright 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /** @const */ var Page = cr.ui.pageManager.Page;
  /** @const */ var PageManager = cr.ui.pageManager.PageManager;

  /**
   * Encapsulated handling of a search bubble.
   * @constructor
   * @extends {HTMLDivElement}
   */
  function SearchBubble(text) {
    var el = cr.doc.createElement('div');
    SearchBubble.decorate(el);
    el.content = text;
    return el;
  }

  /**
   * Prohibit search for guests on desktop.
   */
  function ShouldEnableSearch() {
    return !loadTimeData.getBoolean('profileIsGuest') || cr.isChromeOS;
  }

  SearchBubble.decorate = function(el) {
    el.__proto__ = SearchBubble.prototype;
    el.decorate();
  };

  SearchBubble.prototype = {
    __proto__: HTMLDivElement.prototype,

    decorate: function() {
      this.className = 'search-bubble';

      this.innards_ = cr.doc.createElement('div');
      this.innards_.className = 'search-bubble-innards';
      this.appendChild(this.innards_);

      // We create a timer to periodically update the position of the bubbles.
      // While this isn't all that desirable, it's the only sure-fire way of
      // making sure the bubbles stay in the correct location as sections
      // may dynamically change size at any time.
      this.intervalId = setInterval(this.updatePosition.bind(this), 250);

      this.addEventListener('mouseover', function() {
        this.innards_.classList.toggle('above');
        this.updatePosition();
      });
    },

    /**
     * Sets the text message in the bubble.
     * @param {string} text The text the bubble will show.
     */
    set content(text) {
      this.innards_.textContent = text;
    },

    /**
     * Attach the bubble to the element.
     */
    attachTo: function(element) {
      var parent = element.parentElement;
      if (!parent)
        return;
      if (parent.tagName == 'TD') {
        // To make absolute positioning work inside a table cell we need
        // to wrap the bubble div into another div with position:relative.
        // This only works properly if the element is the first child of the
        // table cell which is true for all options pages.
        this.wrapper = cr.doc.createElement('div');
        this.wrapper.className = 'search-bubble-wrapper';
        this.wrapper.appendChild(this);
        parent.insertBefore(this.wrapper, element);
      } else {
        parent.insertBefore(this, element);
      }
    },

    /**
     * Clear the interval timer and remove the element from the page.
     */
    dispose: function() {
      clearInterval(this.intervalId);

      var child = this.wrapper || this;
      var parent = child.parentNode;
      if (parent)
        parent.removeChild(child);
    },

    /**
     * Update the position of the bubble.  Called at creation time and then
     * periodically while the bubble remains visible.
     */
    updatePosition: function() {
      // This bubble is 'owned' by the next sibling.
      var owner = (this.wrapper || this).nextSibling;

      // If there isn't an offset parent, we have nothing to do.
      if (!owner.offsetParent)
        return;

      // Position the bubble below the location of the owner.
      var left = owner.offsetLeft + owner.offsetWidth / 2 -
          this.offsetWidth / 2;

      var BUBBLE_EDGE_OFFSET = 5;
      var top = owner.offsetTop;
      if (this.innards_.classList.contains('above'))
        top -= this.offsetHeight + BUBBLE_EDGE_OFFSET;
      else
        top += owner.offsetHeight + BUBBLE_EDGE_OFFSET;

      // Update the position in the CSS.  Cache the last values for
      // best performance.
      if (left != this.lastLeft) {
        this.style.left = left + 'px';
        this.lastLeft = left;
      }
      if (top != this.lastTop) {
        this.style.top = top + 'px';
        this.lastTop = top;
      }
    },
  };

  /**
   * Encapsulated handling of the search page.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function SearchPage() {
    Page.call(this, 'search',
              loadTimeData.getString('searchPageTabTitle'),
              'searchPage');
  }

  cr.addSingletonGetter(SearchPage);

  SearchPage.prototype = {
    // Inherit SearchPage from Page.
    __proto__: Page.prototype,

    /**
     * Wait a bit to see if the user is still entering search text.
     * @type {number|undefined}
     * @private
     */
    delayedSearchMetric_: undefined,

    /**
     * Only send the time of first search once.
     * @type {boolean}
     * @private
     */
    hasSentFirstSearchTime_: false,

    /**
     * A boolean to prevent recursion. Used by setSearchText_().
     * @type {boolean}
     * @private
     */
    insideSetSearchText_: false,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      // Record the start time for use in reporting metrics.
      this.createdTimestamp_ = Date.now();

      this.searchField = $('search-field');

      // Handle search events. (No need to throttle, WebKit's search field
      // will do that automatically.)
      this.searchField.onsearch = function(e) {
        this.setSearchText_(e.currentTarget.value);
      }.bind(this);

      // Install handler for key presses.
      document.addEventListener('keydown',
                                this.keyDownEventHandler_.bind(this));
    },

    /** @override */
    get sticky() {
      return true;
    },

    /** @override */
    didShowPage: function() {
      // This method is called by the PageManager after all pages have had their
      // visibility attribute set. At this point we can perform the
      // search-specific DOM manipulation.
      this.setSearchActive_(true);
    },

    /** @override */
    didChangeHash: function() {
      this.setSearchActive_(true);
    },

    /** @override */
    willHidePage: function() {
      // This method is called by the PageManager before all pages have their
      // visibility attribute set. Before that happens, we need to undo the
      // search-specific DOM manipulation that was performed in didShowPage.
      this.setSearchActive_(false);
    },

    /**
     * Update the UI to reflect whether we are in a search state.
     * @param {boolean} active True if we are on the search page.
     * @private
     */
    setSearchActive_: function(active) {
      // It's fine to exit if search wasn't active and we're not going to
      // activate it now.
      if (!this.searchActive_ && !active)
        return;

      if (!ShouldEnableSearch())
        return;

      this.searchActive_ = active;

      if (active) {
        var hash = this.hash;
        if (hash) {
          this.searchField.value =
              decodeURIComponent(hash.slice(1).replace(/\+/g, ' '));
        } else if (!this.searchField.value) {
          // This should only happen if the user goes directly to
          // http://chromesettings.github.io/settings-frame/search
          PageManager.showDefaultPage();
          return;
        }

        // Move 'advanced' sections into the main settings page to allow
        // searching.
        if (!this.advancedSections_) {
          this.advancedSections_ =
              $('advanced-settings-container').querySelectorAll('section');
          for (var i = 0, section; section = this.advancedSections_[i]; i++)
            $('settings').appendChild(section);
        }
      } else {
        this.searchField.value = '';
      }

      var pagesToSearch = this.getSearchablePages_();
      for (var key in pagesToSearch) {
        var page = pagesToSearch[key];

        if (!active)
          page.visible = false;

        // Update the visible state of all top-level elements that are not
        // sections (ie titles, button strips).  We do this before changing
        // the page visibility to avoid excessive re-draw.
        for (var i = 0, childDiv; childDiv = page.pageDiv.children[i]; i++) {
          if (active) {
            if (childDiv.tagName != 'SECTION')
              childDiv.classList.add('search-hidden');
          } else {
            childDiv.classList.remove('search-hidden');
          }
        }

        if (active) {
          // When search is active, remove the 'hidden' tag.  This tag may have
          // been added by the PageManager.
          page.pageDiv.hidden = false;
        }
      }

      if (active) {
        this.setSearchText_(this.searchField.value);
        this.searchField.focus();
      } else {
        // After hiding all page content, remove any search results.
        this.unhighlightMatches_();
        this.removeSearchBubbles_();

        // Move 'advanced' sections back into their original container.
        if (this.advancedSections_) {
          for (var i = 0, section; section = this.advancedSections_[i]; i++)
            $('advanced-settings-container').appendChild(section);
          this.advancedSections_ = null;
        }
      }
    },

    /**
     * Set the current search criteria.
     * @param {string} text Search text.
     * @private
     */
    setSearchText_: function(text) {
      if (!ShouldEnableSearch())
        return;

      // Prevent recursive execution of this method.
      if (this.insideSetSearchText_) return;
      this.insideSetSearchText_ = true;

      // Cleanup the search query string.
      text = SearchPage.canonicalizeQuery(text);

      // If the search string becomes empty, flip back to the default page.
      if (!text) {
        if (this.searchActive_)
          PageManager.showDefaultPage();
        this.insideSetSearchText_ = false;
        return;
      }

      if (!this.hasSentFirstSearchTime_) {
        this.hasSentFirstSearchTime_ = true;
        chrome.metricsPrivate.recordMediumTime('Settings.TimeToFirstSearch',
            Date.now() - this.createdTimestamp_);
      }

      // Toggle the search page if necessary. Otherwise, update the hash.
      var hash = '#' + encodeURIComponent(text);
      if (this.searchActive_) {
        if (this.hash != hash)
          this.setHash(hash);
      } else {
        PageManager.showPageByName(this.name, true, {hash: hash});
      }

      var foundMatches = false;

      // Remove any prior search results.
      this.unhighlightMatches_();
      this.removeSearchBubbles_();

      var pagesToSearch = this.getSearchablePages_();
      for (var key in pagesToSearch) {
        var page = pagesToSearch[key];
        var elements = page.pageDiv.querySelectorAll('section');
        for (var i = 0, node; node = elements[i]; i++) {
          node.classList.add('search-hidden');
        }
      }

      var bubbleControls = [];
      var pageMatchesForMetrics = 0;
      var subpageMatchesForMetrics = 0;

      // Generate search text by applying lowercase and escaping any characters
      // that would be problematic for regular expressions.
      var searchText =
          text.toLowerCase().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      // Generate a regular expression for hilighting search terms.
      var regExp = new RegExp('(' + searchText + ')', 'ig');

      if (searchText.length) {
        // Search all top-level sections for anchored string matches.
        for (var key in pagesToSearch) {
          var page = pagesToSearch[key];
          var elements =
              page.pageDiv.querySelectorAll('section');
          for (var i = 0, node; node = elements[i]; i++) {
            if (this.highlightMatches_(regExp, node)) {
              node.classList.remove('search-hidden');
              if (!node.hidden) {
                foundMatches = true;
                pageMatchesForMetrics += 1;
              }
            }
          }
        }

        // Search all sub-pages, generating an array of top-level sections that
        // we need to make visible.
        var subPagesToSearch = this.getSearchableSubPages_();
        var control, node;
        for (var key in subPagesToSearch) {
          var page = subPagesToSearch[key];
          if (this.highlightMatches_(regExp, page.pageDiv)) {
            this.revealAssociatedSections_(page);

            bubbleControls =
                bubbleControls.concat(this.getAssociatedControls_(page));

            foundMatches = true;
            subpageMatchesForMetrics += 1;
          }
        }
      }

      // Configure elements on the search results page based on search results.
      $('searchPageNoMatches').hidden = foundMatches;

      // Create search balloons for sub-page results.
      var bubbleCount = bubbleControls.length;
      for (var i = 0; i < bubbleCount; i++)
        this.createSearchBubble_(bubbleControls[i], text);

      // If the search doesn't change for one second, send some metrics.
      clearTimeout(this.delayedSearchMetric_);
      this.delayedSearchMetric_ = setTimeout(function() {
        if (!foundMatches) {
          chrome.metricsPrivate.recordSmallCount(
            'Settings.SearchLengthNoMatch', text.length);
        }
        chrome.metricsPrivate.recordUserAction('Settings.Searching');
        chrome.metricsPrivate.recordSmallCount(
            'Settings.SearchLength', text.length);
        chrome.metricsPrivate.recordSmallCount(
            'Settings.SearchPageMatchCount', pageMatchesForMetrics);
        chrome.metricsPrivate.recordSmallCount(
            'Settings.SearchSubpageMatchCount', subpageMatchesForMetrics);
      }, 1000);

      // Cleanup the recursion-prevention variable.
      this.insideSetSearchText_ = false;
    },

    /**
     * Reveal the associated section for |subpage|, as well as the one for its
     * |parentPage|, and its |parentPage|'s |parentPage|, etc.
     * @private
     */
    revealAssociatedSections_: function(subpage) {
      for (var page = subpage; page; page = page.parentPage) {
        var section = page.associatedSection;
        if (section)
          section.classList.remove('search-hidden');
      }
    },

    /**
     * @return {!Array<HTMLElement>} all the associated controls for |subpage|,
     * including |subpage.associatedControls| as well as any controls on parent
     * pages that are indirectly necessary to get to the subpage.
     * @private
     */
    getAssociatedControls_: function(subpage) {
      var controls = [];
      for (var page = subpage; page; page = page.parentPage) {
        if (page.associatedControls)
          controls = controls.concat(page.associatedControls);
      }
      return controls;
    },

    /**
     * Wraps matches in spans.
     * @param {RegExp} regExp The search query (in regexp form).
     * @param {Element} element An HTML container element to recursively search
     *     within.
     * @return {boolean} true if the element was changed.
     * @private
     */
    highlightMatches_: function(regExp, element) {
      var found = false;
      var div, child, tmp;

      // Walk the tree, searching each TEXT node.
      var walker = document.createTreeWalker(element,
                                             NodeFilter.SHOW_TEXT,
                                             null,
                                             false);
      var node = walker.nextNode();
      while (node) {
        var textContent = node.nodeValue;
        // Perform a search and replace on the text node value.
        var split = textContent.split(regExp);
        if (split.length > 1) {
          found = true;
          var nextNode = walker.nextNode();
          var parentNode = node.parentNode;
          // Use existing node as placeholder to determine where to insert the
          // replacement content.
          for (var i = 0; i < split.length; ++i) {
            if (i % 2 == 0) {
              parentNode.insertBefore(document.createTextNode(split[i]), node);
            } else {
              var span = document.createElement('span');
              span.className = 'search-highlighted';
              span.textContent = split[i];
              parentNode.insertBefore(span, node);
            }
          }
          // Remove old node.
          parentNode.removeChild(node);
          node = nextNode;
        } else {
          node = walker.nextNode();
        }
      }

      return found;
    },

    /**
     * Removes all search highlight tags from the document.
     * @private
     */
    unhighlightMatches_: function() {
      // Find all search highlight elements.
      var elements = document.querySelectorAll('.search-highlighted');

      // For each element, remove the highlighting.
      var parent, i;
      for (var i = 0, node; node = elements[i]; i++) {
        parent = node.parentNode;

        // Replace the highlight element with the first child (the text node).
        parent.replaceChild(node.firstChild, node);

        // Normalize the parent so that multiple text nodes will be combined.
        parent.normalize();
      }
    },

    /**
     * Creates a search result bubble attached to an element.
     * @param {Element} element An HTML element, usually a button.
     * @param {string} text A string to show in the bubble.
     * @private
     */
    createSearchBubble_: function(element, text) {
      // avoid appending multiple bubbles to a button.
      var sibling = element.previousElementSibling;
      if (sibling && (sibling.classList.contains('search-bubble') ||
                      sibling.classList.contains('search-bubble-wrapper')))
        return;

      var parent = element.parentElement;
      if (parent) {
        var bubble = new SearchBubble(text);
        bubble.attachTo(element);
        bubble.updatePosition();
      }
    },

    /**
     * Removes all search match bubbles.
     * @private
     */
    removeSearchBubbles_: function() {
      var elements = document.querySelectorAll('.search-bubble');
      var length = elements.length;
      for (var i = 0; i < length; i++)
        elements[i].dispose();
    },

    /**
     * Builds a list of top-level pages to search.  Omits the search page and
     * all sub-pages.
     * @return {Array} An array of pages to search.
     * @private
     */
    getSearchablePages_: function() {
      var name, page, pages = [];
      for (name in PageManager.registeredPages) {
        if (name != this.name) {
          page = PageManager.registeredPages[name];
          if (!page.parentPage)
            pages.push(page);
        }
      }
      return pages;
    },

    /**
     * Builds a list of sub-pages (and overlay pages) to search.  Ignore pages
     * that have no associated controls, or whose controls are hidden.
     * @return {Array} An array of pages to search.
     * @private
     */
    getSearchableSubPages_: function() {
      var name, pageInfo, page, pages = [];
      for (name in PageManager.registeredPages) {
        page = PageManager.registeredPages[name];
        if (page.parentPage &&
            page.associatedSection &&
            !page.associatedSection.hidden) {
          pages.push(page);
        }
      }
      for (name in PageManager.registeredOverlayPages) {
        page = PageManager.registeredOverlayPages[name];
        if (page.associatedSection &&
            !page.associatedSection.hidden &&
            page.pageDiv != undefined) {
          pages.push(page);
        }
      }
      return pages;
    },

    /**
     * A function to handle key press events.
     * @param {Event} event A keydown event.
     * @private
     */
    keyDownEventHandler_: function(event) {
      /** @const */ var ESCAPE_KEY_CODE = 27;
      /** @const */ var FORWARD_SLASH_KEY_CODE = 191;

      switch (event.keyCode) {
        case ESCAPE_KEY_CODE:
          if (event.target == this.searchField) {
            this.setSearchText_('');
            this.searchField.blur();
            event.stopPropagation();
            event.preventDefault();
          }
          break;
        case FORWARD_SLASH_KEY_CODE:
          if (!/INPUT|SELECT|BUTTON|TEXTAREA/.test(event.target.tagName) &&
              !event.ctrlKey && !event.altKey) {
            this.searchField.focus();
            event.stopPropagation();
            event.preventDefault();
          }
          break;
      }
    },
  };

  /**
   * Standardizes a user-entered text query by removing extra whitespace.
   * @param {string} text The user-entered text.
   * @return {string} The trimmed query.
   */
  SearchPage.canonicalizeQuery = function(text) {
    // Trim beginning and ending whitespace.
    return text.replace(/^\s+|\s+$/g, '');
  };

  // Export
  return {
    SearchPage: SearchPage
  };

});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /** @const */ var ArrayDataModel = cr.ui.ArrayDataModel;
  /** @const */ var SettingsDialog = options.SettingsDialog;

  /**
   * StartupOverlay class
   * Encapsulated handling of the 'Set Startup pages' overlay page.
   * @constructor
   * @extends {options.SettingsDialog}
   */
  function StartupOverlay() {
    SettingsDialog.call(this, 'startup',
        loadTimeData.getString('startupPagesOverlayTabTitle'),
        'startup-overlay',
        assertInstanceof($('startup-overlay-confirm'), HTMLButtonElement),
        assertInstanceof($('startup-overlay-cancel'), HTMLButtonElement));
  };

  cr.addSingletonGetter(StartupOverlay);

  StartupOverlay.prototype = {
    __proto__: SettingsDialog.prototype,

    /**
     * An autocomplete list that can be attached to a text field during editing.
     * @type {HTMLElement}
     * @private
     */
    autocompleteList_: null,

    startup_pages_pref_: {
      'name': 'session.startup_urls',
      'disabled': false
    },

    /** @override */
    initializePage: function() {
      SettingsDialog.prototype.initializePage.call(this);

      var self = this;

      var startupPagesList = $('startupPagesList');
      options.browser_options.StartupPageList.decorate(startupPagesList);
      startupPagesList.autoExpands = true;

      $('startupUseCurrentButton').onclick = function(event) {
        chrome.send('setStartupPagesToCurrentPages');
      };

      Preferences.getInstance().addEventListener(
          this.startup_pages_pref_.name,
          this.handleStartupPageListChange_.bind(this));

      var suggestionList = new cr.ui.AutocompleteList();
      suggestionList.autoExpands = true;
      suggestionList.requestSuggestions =
          this.requestAutocompleteSuggestions_.bind(this);
      $('startup-overlay').appendChild(suggestionList);
      this.autocompleteList_ = suggestionList;
      startupPagesList.autocompleteList = suggestionList;
    },

    /** @override */
    handleConfirm: function() {
      SettingsDialog.prototype.handleConfirm.call(this);
      chrome.send('commitStartupPrefChanges');
      // Set the startup behavior to "open specific set of pages" so that the
      // pages the user selected actually get opened on startup.
      Preferences.setIntegerPref('session.restore_on_startup', 4, true);
    },

    /** @override */
    handleCancel: function() {
      SettingsDialog.prototype.handleCancel.call(this);
      chrome.send('cancelStartupPrefChanges');
    },

    /**
     * Sets the enabled state of the custom startup page list
     * @param {boolean} disable True to disable, false to enable
     */
    setControlsDisabled: function(disable) {
      var startupPagesList = $('startupPagesList');
      startupPagesList.disabled = disable;
      // Explicitly set disabled state for input text elements.
      var inputs = startupPagesList.querySelectorAll("input[type='text']");
      for (var i = 0; i < inputs.length; i++)
        inputs[i].disabled = disable;
      $('startupUseCurrentButton').disabled = disable;
    },

    /**
     * Enables or disables the the custom startup page list controls
     * based on the whether the 'pages to restore on startup' pref is enabled.
     */
    updateControlStates: function() {
      this.setControlsDisabled(
          this.startup_pages_pref_.disabled);
    },

    /**
     * Handles change events of the preference
     * 'session.startup_urls'.
     * @param {Event} event Preference changed event.
     * @private
     */
    handleStartupPageListChange_: function(event) {
      this.startup_pages_pref_.disabled = event.value.disabled;
      this.updateControlStates();
    },

    /**
     * Updates the startup pages list with the given entries.
     * @param {!Array} pages List of startup pages.
     * @private
     */
    updateStartupPages_: function(pages) {
      var model = new ArrayDataModel(pages);
      // Add a "new page" row.
      model.push({modelIndex: -1});
      $('startupPagesList').dataModel = model;
    },

    /**
     * Sends an asynchronous request for new autocompletion suggestions for the
     * the given query. When new suggestions are available, the C++ handler will
     * call updateAutocompleteSuggestions_.
     * @param {string} query List of autocomplete suggestions.
     * @private
     */
    requestAutocompleteSuggestions_: function(query) {
      chrome.send('requestAutocompleteSuggestionsForStartupPages', [query]);
    },

    /**
     * Updates the autocomplete suggestion list with the given entries.
     * @param {Array} suggestions List of autocomplete suggestions.
     * @private
     */
    updateAutocompleteSuggestions_: function(suggestions) {
      var list = this.autocompleteList_;
      // If the trigger for this update was a value being selected from the
      // current list, do nothing.
      if (list.targetInput && list.selectedItem &&
          list.selectedItem.url == list.targetInput.value) {
        return;
      }
      list.suggestions = suggestions;
    },
  };

  // Forward public APIs to private implementations.
  cr.makePublic(StartupOverlay, [
    'updateStartupPages',
    'updateAutocompleteSuggestions',
  ]);

  // Export
  return {
    StartupOverlay: StartupOverlay
  };
});

// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  var Page = cr.ui.pageManager.Page;
  var PageManager = cr.ui.pageManager.PageManager;

  /**
   * SupervisedUserCreateConfirm class.
   * Encapsulated handling of the confirmation overlay page when creating a
   * supervised user.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function SupervisedUserCreateConfirmOverlay() {
    Page.call(this, 'supervisedUserCreateConfirm',
              '',  // The title will be based on the new profile name.
              'supervised-user-created');
  };

  cr.addSingletonGetter(SupervisedUserCreateConfirmOverlay);

  SupervisedUserCreateConfirmOverlay.prototype = {
    // Inherit from Page.
    __proto__: Page.prototype,

    // Info about the newly created profile.
    profileInfo_: null,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      $('supervised-user-created-done').onclick = function(event) {
        PageManager.closeOverlay();
      };

      var self = this;

      $('supervised-user-created-switch').onclick = function(event) {
        PageManager.closeOverlay();
        chrome.send('switchToProfile', [self.profileInfo_.filePath]);
      };
    },

    /** @override */
    didShowPage: function() {
      $('supervised-user-created-switch').focus();
    },

    /**
     * Sets the profile info used in the dialog and updates the profile name
     * displayed. Called by the profile creation overlay when this overlay is
     * opened.
     * @param {Object} info An object of the form:
     *     info = {
     *       name: "Profile Name",
     *       filePath: "/path/to/profile/data/on/disk",
     *       isSupervised: (true|false)
     *       custodianEmail: "example@gmail.com"
     *     };
     * @private
     */
    setProfileInfo_: function(info) {
      this.profileInfo_ = info;
      var MAX_LENGTH = 50;
      var elidedName = elide(info.name, MAX_LENGTH);
      $('supervised-user-created-title').textContent =
          loadTimeData.getStringF('supervisedUserCreatedTitle', elidedName);
      $('supervised-user-created-switch').textContent =
          loadTimeData.getStringF('supervisedUserCreatedSwitch', elidedName);

      // HTML-escape the user-supplied strings before putting them into
      // innerHTML. This is probably excessive for the email address, but
      // belt-and-suspenders is cheap here.
      $('supervised-user-created-text').innerHTML =
          loadTimeData.getStringF('supervisedUserCreatedText',
                                  HTMLEscape(elidedName),
                                  HTMLEscape(elide(info.custodianEmail,
                                                   MAX_LENGTH)));
    },

    /** @override */
    canShowPage: function() {
      return this.profileInfo_ != null;
    },

    /**
     * Updates the displayed profile name if it has changed. Called by the
     * handler.
     * @param {string} filePath The file path of the profile whose name
     *     changed.
     * @param {string} newName The changed profile's new name.
     * @private
     */
    onUpdatedProfileName_: function(filePath, newName) {
      if (filePath == this.profileInfo_.filePath) {
        this.profileInfo_.name = newName;
        this.setProfileInfo_(this.profileInfo_);
      }
    },

    /**
     * Closes this overlay if the new profile has been deleted. Called by the
     * handler.
     * @param {string} filePath The file path of the profile that was deleted.
     * @private
     */
    onDeletedProfile_: function(filePath) {
      if (filePath == this.profileInfo_.filePath) {
        PageManager.closeOverlay();
      }
    },
  };

  // Forward public APIs to private implementations.
  cr.makePublic(SupervisedUserCreateConfirmOverlay, [
    'onDeletedProfile',
    'onUpdatedProfileName',
    'setProfileInfo',
  ]);

  // Export
  return {
    SupervisedUserCreateConfirmOverlay: SupervisedUserCreateConfirmOverlay,
  };
});

// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  var Page = cr.ui.pageManager.Page;
  var PageManager = cr.ui.pageManager.PageManager;
  var ArrayDataModel = cr.ui.ArrayDataModel;

  /**
   * SupervisedUserImportOverlay class.
   * Encapsulated handling of the 'Import existing supervised user' overlay
   * page.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function SupervisedUserImportOverlay() {
    var title = loadTimeData.getString('supervisedUserImportTitle');
    Page.call(this, 'supervisedUserImport', title, 'supervised-user-import');
  };

  cr.addSingletonGetter(SupervisedUserImportOverlay);

  SupervisedUserImportOverlay.prototype = {
    // Inherit from Page.
    __proto__: Page.prototype,

    /** @override */
    canShowPage: function() {
      return !BrowserOptions.getCurrentProfile().isSupervised;
    },

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      var supervisedUserList = $('supervised-user-list');
      options.supervisedUserOptions.SupervisedUserList.decorate(
          supervisedUserList);

      var avatarGrid = $('select-avatar-grid');
      options.ProfilesIconGrid.decorate(avatarGrid);
      var avatarIcons = loadTimeData.getValue('avatarIcons');
      avatarGrid.dataModel = new ArrayDataModel(
          /** @type {!Array} */(avatarIcons));

      supervisedUserList.addEventListener('change', function(event) {
        var supervisedUser = supervisedUserList.selectedItem;
        $('supervised-user-import-ok').disabled =
            !supervisedUser || supervisedUser.onCurrentDevice;
      });

      var self = this;
      $('supervised-user-import-cancel').onclick = function(event) {
        if (self.inProgress_) {
          self.updateImportInProgress_(false);

          // 'cancelCreateProfile' is handled by CreateProfileHandler.
          chrome.send('cancelCreateProfile');
        }
        PageManager.closeOverlay();
      };

      $('supervised-user-import-ok').onclick =
          this.showAvatarGridOrSubmit_.bind(this);
      $('supervised-user-select-avatar-ok').onclick =
          this.showAvatarGridOrSubmit_.bind(this);
    },

    /**
     * @override
     */
    didShowPage: function() {
      // When the import link is clicked to open this overlay, it is hidden in
      // order to trigger a cursor update. We can show the import link again
      // now. TODO(akuegel): Remove this temporary fix when crbug/246304 is
      // resolved.
      $('import-existing-supervised-user-link').hidden = false;

      options.SupervisedUserListData.requestExistingSupervisedUsers().then(
          this.receiveExistingSupervisedUsers_.bind(this),
          this.onSigninError_.bind(this));
      options.SupervisedUserListData.addObserver(this);

      this.updateImportInProgress_(false);
      $('supervised-user-import-error-bubble').hidden = true;
      $('supervised-user-import-ok').disabled = true;
      this.showAppropriateElements_(/* isSelectAvatarMode */ false);
    },

    /**
     * @override
     */
    didClosePage: function() {
      options.SupervisedUserListData.removeObserver(this);
    },

    /**
     * Shows either the supervised user import dom elements or the select avatar
     * dom elements.
     * @param {boolean} isSelectAvatarMode True if the overlay should show the
     *     select avatar grid, and false if the overlay should show the
     *     supervised user list.
     * @private
     */
    showAppropriateElements_: function(isSelectAvatarMode) {
      var avatarElements =
          this.pageDiv.querySelectorAll('.supervised-user-select-avatar');
      for (var i = 0; i < avatarElements.length; i++)
        avatarElements[i].hidden = !isSelectAvatarMode;
      var importElements =
          this.pageDiv.querySelectorAll('.supervised-user-import');
      for (var i = 0; i < importElements.length; i++)
        importElements[i].hidden = isSelectAvatarMode;
    },

    /**
     * Called when the user clicks the "OK" button. In case the supervised
     * user being imported has no avatar in sync, it shows the avatar
     * icon grid. In case the avatar grid is visible or the supervised user
     * already has an avatar stored in sync, it proceeds with importing
     * the supervised user.
     * @private
     */
    showAvatarGridOrSubmit_: function() {
      var supervisedUser = $('supervised-user-list').selectedItem;
      if (!supervisedUser)
        return;

      $('supervised-user-import-error-bubble').hidden = true;

      if ($('select-avatar-grid').hidden && supervisedUser.needAvatar) {
        this.showAvatarGridHelper_();
        return;
      }

      var avatarUrl = supervisedUser.needAvatar ?
          $('select-avatar-grid').selectedItem : supervisedUser.iconURL;

      this.updateImportInProgress_(true);

      // 'createProfile' is handled by CreateProfileHandler.
      chrome.send('createProfile', [supervisedUser.name, avatarUrl,
                                    false, true, supervisedUser.id]);
    },

    /**
     * Hides the 'supervised user list' and shows the avatar grid instead.
     * It also updates the overlay text and title to instruct the user
     * to choose an avatar for the supervised user.
     * @private
     */
    showAvatarGridHelper_: function() {
      this.showAppropriateElements_(/* isSelectAvatarMode */ true);
      $('select-avatar-grid').redraw();
      $('select-avatar-grid').selectedItem =
          loadTimeData.getValue('avatarIcons')[0];
    },

    /**
     * Updates the UI according to the importing state.
     * @param {boolean} inProgress True to indicate that
     *     importing is in progress and false otherwise.
     * @private
     */
    updateImportInProgress_: function(inProgress) {
      this.inProgress_ = inProgress;
      $('supervised-user-import-ok').disabled = inProgress;
      $('supervised-user-select-avatar-ok').disabled = inProgress;
      $('supervised-user-list').disabled = inProgress;
      $('select-avatar-grid').disabled = inProgress;
      $('supervised-user-import-throbber').hidden = !inProgress;
    },

    /**
     * Sets the data model of the supervised user list to |supervisedUsers|.
     * @param {Array<{id: string, name: string, iconURL: string,
     *     onCurrentDevice: boolean, needAvatar: boolean}>} supervisedUsers
     *     Array of supervised user objects.
     * @private
     */
    receiveExistingSupervisedUsers_: function(supervisedUsers) {
      supervisedUsers.sort(function(a, b) {
        if (a.onCurrentDevice != b.onCurrentDevice)
          return a.onCurrentDevice ? 1 : -1;
        return a.name.localeCompare(b.name);
      });

      $('supervised-user-list').dataModel = new ArrayDataModel(supervisedUsers);
      if (supervisedUsers.length == 0) {
        this.onErrorInternal_(
            loadTimeData.getString('noExistingSupervisedUsers'));
        $('supervised-user-import-ok').disabled = true;
      } else {
        // Hide the error bubble.
        $('supervised-user-import-error-bubble').hidden = true;
      }
    },

    onSigninError_: function() {
      $('supervised-user-list').dataModel = null;
      this.onErrorInternal_(
          loadTimeData.getString('supervisedUserImportSigninError'));
    },

    /**
     * Displays an error message if an error occurs while
     * importing a supervised user.
     * Called by BrowserOptions via the BrowserOptionsHandler.
     * @param {string} error The error message to display.
     * @private
     */
    onError_: function(error) {
      this.onErrorInternal_(error);
      this.updateImportInProgress_(false);
    },

    /**
     * Displays an error message.
     * @param {string} error The error message to display.
     * @private
     */
    onErrorInternal_: function(error) {
      var errorBubble = $('supervised-user-import-error-bubble');
      errorBubble.hidden = false;
      errorBubble.textContent = error;
    },

    /**
     * Closes the overlay if importing the supervised user was successful. Also
     * reset the cached list of supervised users in order to get an updated list
     * when the overlay is reopened.
     * @private
     */
    onSuccess_: function() {
      this.updateImportInProgress_(false);
      options.SupervisedUserListData.resetPromise();
      PageManager.closeAllOverlays();
    },
  };

  // Forward public APIs to private implementations.
  cr.makePublic(SupervisedUserImportOverlay, [
    'onError',
    'onSuccess',
  ]);

  // Export
  return {
    SupervisedUserImportOverlay: SupervisedUserImportOverlay,
  };
});

// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  var Page = cr.ui.pageManager.Page;

  /**
   * SupervisedUserLearnMore class.
   * Encapsulated handling of the 'Learn more...' overlay page.
   * @constructor
   * @extends {cr.ui.pageManager.Page}
   */
  function SupervisedUserLearnMoreOverlay() {
    Page.call(this, 'supervisedUserLearnMore',
              loadTimeData.getString('supervisedUserLearnMoreTitle'),
              'supervised-user-learn-more');
  };

  cr.addSingletonGetter(SupervisedUserLearnMoreOverlay);

  SupervisedUserLearnMoreOverlay.prototype = {
    // Inherit from Page.
    __proto__: Page.prototype,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      $('supervised-user-learn-more-done').onclick = function(event) {
        cr.ui.pageManager.PageManager.closeOverlay();
      };
    },
  };

  // Export
  return {
    SupervisedUserLearnMoreOverlay: SupervisedUserLearnMoreOverlay,
  };
});

// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options.supervisedUserOptions', function() {
  /** @const */ var List = cr.ui.List;
  /** @const */ var ListItem = cr.ui.ListItem;
  /** @const */ var ListSingleSelectionModel = cr.ui.ListSingleSelectionModel;

  /**
   * Create a new supervised user list item.
   * @param {Object} entry The supervised user this item represents.
   *     It has the following form:
   *       supervisedUser = {
   *         id: "Supervised User ID",
   *         name: "Supervised User Name",
   *         iconURL: "http://chromesettings.github.io/path/to/icon/image",
   *         onCurrentDevice: true or false,
   *         needAvatar: true or false
   *       }
   * @constructor
   * @extends {cr.ui.ListItem}
   */
  function SupervisedUserListItem(entry) {
    var el = cr.doc.createElement('div');
    el.className = 'list-item';
    el.supervisedUser_ = entry;
    el.__proto__ = SupervisedUserListItem.prototype;
    el.decorate();
    return el;
  }

  SupervisedUserListItem.prototype = {
    __proto__: ListItem.prototype,

    /**
     * @type {string} the ID of this supervised user list item.
     */
    get id() {
      return this.supervisedUser_.id;
    },

    /**
     * @type {string} the name of this supervised user list item.
     */
    get name() {
      return this.supervisedUser_.name;
    },

    /**
     * @type {string} the path to the avatar icon of this supervised
     *     user list item.
     */
    get iconURL() {
      return this.supervisedUser_.iconURL;
    },

    /** @override */
    decorate: function() {
      ListItem.prototype.decorate.call(this);
      var supervisedUser = this.supervisedUser_;

      // Add the avatar.
      var iconElement = this.ownerDocument.createElement('img');
      iconElement.className = 'profile-img';
      iconElement.style.content = getProfileAvatarIcon(supervisedUser.iconURL);
      this.appendChild(iconElement);

      // Add the profile name.
      var nameElement = this.ownerDocument.createElement('div');
      nameElement.className = 'profile-name';
      nameElement.textContent = supervisedUser.name;
      this.appendChild(nameElement);

      if (supervisedUser.onCurrentDevice) {
        iconElement.className += ' profile-img-disabled';
        nameElement.className += ' profile-name-disabled';

        // Add "(already on this device)" message.
        var alreadyOnDeviceElement = this.ownerDocument.createElement('div');
        alreadyOnDeviceElement.className =
            'profile-name-disabled already-on-this-device';
        alreadyOnDeviceElement.textContent =
            loadTimeData.getString('supervisedUserAlreadyOnThisDevice');
        this.appendChild(alreadyOnDeviceElement);
      }
    },
  };

  /**
   * Create a new supervised users list.
   * @constructor
   * @extends {cr.ui.List}
   */
  var SupervisedUserList = cr.ui.define('list');

  SupervisedUserList.prototype = {
    __proto__: List.prototype,

    /**
     * @override
     * @param {Object} entry
     */
    createItem: function(entry) {
      return new SupervisedUserListItem(entry);
    },

    /** @override */
    decorate: function() {
      List.prototype.decorate.call(this);
      this.selectionModel = new ListSingleSelectionModel();
      this.autoExpands = true;
    },
  };

  return {
    SupervisedUserListItem: SupervisedUserListItem,
    SupervisedUserList: SupervisedUserList,
  };
});

// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('options', function() {
  /**
   * SupervisedUserListData class.
   * Handles requests for retrieving a list of existing supervised users which
   * are supervised by the current profile. For each request a promise is
   * returned, which is cached in order to reuse the retrieved supervised users
   * for future requests. The first request will be handled asynchronously.
   * @constructor
   * @class
   */
  function SupervisedUserListData() {
    this.observers_ = [];
  };

  cr.addSingletonGetter(SupervisedUserListData);

  /**
   * Receives a list of supervised users and resolves the promise.
   * @param {Array<Object>} supervisedUsers Array of supervised user objects.
   *     Each object is of the form:
   *       supervisedUser = {
   *         id: "Supervised User ID",
   *         name: "Supervised User Name",
   *         iconURL: "http://chromesettings.github.io/path/to/icon/image",
   *         onCurrentDevice: true or false,
   *         needAvatar: true or false
   *       }
   * @private
   */
  SupervisedUserListData.prototype.receiveExistingSupervisedUsers_ =
      function(supervisedUsers) {
    if (!this.promise_) {
      this.onDataChanged_(supervisedUsers);
      return;
    }
    this.resolve_(supervisedUsers);
  };

  /**
   * Called when there is a signin error when retrieving the list of supervised
   * users. Rejects the promise and resets the cached promise to null.
   * @private
   */
  SupervisedUserListData.prototype.onSigninError_ = function() {
    if (!this.promise_) {
      return;
    }
    this.reject_();
    this.resetPromise_();
  };

  /**
   * Handles the request for the list of existing supervised users by returning
   * a promise for the requested data. If there is no cached promise yet, a new
   * one will be created.
   * @return {Promise} The promise containing the list of supervised users.
   * @private
   */
  SupervisedUserListData.prototype.requestExistingSupervisedUsers_ =
      function() {
    if (this.promise_)
      return this.promise_;
    this.promise_ = this.createPromise_();
    chrome.send('requestSupervisedUserImportUpdate');
    return this.promise_;
  };

  /**
   * Creates the promise containing the list of supervised users. The promise is
   * resolved in receiveExistingSupervisedUsers_() or rejected in
   * onSigninError_(). The promise is cached, so that for future requests it can
   * be resolved immediately.
   * @return {Promise} The promise containing the list of supervised users.
   * @private
   */
  SupervisedUserListData.prototype.createPromise_ = function() {
    var self = this;
    return new Promise(function(resolve, reject) {
      self.resolve_ = resolve;
      self.reject_ = reject;
    });
  };

  /**
   * Resets the promise to null in order to avoid stale data. For the next
   * request, a new promise will be created.
   * @private
   */
  SupervisedUserListData.prototype.resetPromise_ = function() {
    this.promise_ = null;
  };

  /**
   * Initializes |promise| with the new data and also passes the new data to
   * observers.
   * @param {Array<Object>} supervisedUsers Array of supervised user objects.
   *     For the format of the objects, see receiveExistingSupervisedUsers_().
   * @private
   */
  SupervisedUserListData.prototype.onDataChanged_ = function(supervisedUsers) {
    this.promise_ = this.createPromise_();
    this.resolve_(supervisedUsers);
    for (var i = 0; i < this.observers_.length; ++i)
      this.observers_[i].receiveExistingSupervisedUsers_(supervisedUsers);
  };

  /**
   * Adds an observer to the list of observers.
   * @param {Object} observer The observer to be added.
   * @private
   */
  SupervisedUserListData.prototype.addObserver_ = function(observer) {
    for (var i = 0; i < this.observers_.length; ++i)
      assert(this.observers_[i] != observer);
    this.observers_.push(observer);
  };

  /**
   * Removes an observer from the list of observers.
   * @param {Object} observer The observer to be removed.
   * @private
   */
  SupervisedUserListData.prototype.removeObserver_ = function(observer) {
    for (var i = 0; i < this.observers_.length; ++i) {
      if (this.observers_[i] == observer) {
        this.observers_.splice(i, 1);
        return;
      }
    }
  };

  // Forward public APIs to private implementations.
  cr.makePublic(SupervisedUserListData, [
    'addObserver',
    'onSigninError',
    'receiveExistingSupervisedUsers',
    'removeObserver',
    'requestExistingSupervisedUsers',
    'resetPromise',
  ]);

  // Export
  return {
    SupervisedUserListData: SupervisedUserListData,
  };
});

// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('help', function() {
  var Page = cr.ui.pageManager.Page;
  var PageManager = cr.ui.pageManager.PageManager;

  /**
   * Encapsulated handling of the About page. Called 'help' internally to avoid
   * confusion with generic AboutUI (about:memory, about:sandbox, etc.).
   */
  function HelpPage() {
    var id = loadTimeData.valueExists('aboutOverlayTabTitle') ?
      'aboutOverlayTabTitle' : 'aboutTitle';
    Page.call(this, 'help', loadTimeData.getString(id), 'help-page');
  }

  cr.addSingletonGetter(HelpPage);

  HelpPage.prototype = {
    __proto__: Page.prototype,

    /**
     * List of the channel names. Should be ordered in increasing level of
     * stability.
     * @private
     */
    channelList_: ['dev-channel', 'beta-channel', 'stable-channel'],

    /**
     * Name of the channel the device is currently on.
     * @private
     */
    currentChannel_: null,

    /**
     * Name of the channel the device is supposed to be on.
     * @private
     */
    targetChannel_: null,

    /**
     * Last status received from the version updater.
     * @private
     */
    status_: null,

    /**
     * Last message received from the version updater.
     * @private
     */
    message_: null,

    /**
     * True if user is allowed to change channels, false otherwise.
     * @private
     */
    can_change_channel_: false,

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      $('product-license').innerHTML = loadTimeData.getString('productLicense');
      if (cr.isChromeOS) {
        $('product-os-license').innerHTML =
            loadTimeData.getString('productOsLicense');
      }

      var productTOS = $('product-tos');
      if (productTOS)
        productTOS.innerHTML = loadTimeData.getString('productTOS');

      $('get-help').onclick = function() {
        chrome.send('openHelpPage');
      };
$('report-issue').onclick = function() {
        chrome.send('openFeedbackDialog');
      };

      this.maybeSetOnClick_($('more-info-expander'),
          this.toggleMoreInfo_.bind(this));

      this.maybeSetOnClick_($('promote'), function() {
        chrome.send('promoteUpdater');
      });
      this.maybeSetOnClick_($('relaunch'), function() {
        chrome.send('relaunchNow');
      });
      if (cr.isChromeOS) {
        this.maybeSetOnClick_($('relaunch-and-powerwash'), function() {
          chrome.send('relaunchAndPowerwash');
        });

        this.channelTable_ = {
          'stable-channel': {
            'name': loadTimeData.getString('stable'),
            'label': loadTimeData.getString('currentChannelStable'),
          },
          'beta-channel': {
            'name': loadTimeData.getString('beta'),
            'label': loadTimeData.getString('currentChannelBeta')
          },
          'dev-channel': {
            'name': loadTimeData.getString('dev'),
            'label': loadTimeData.getString('currentChannelDev')
          }
        };
      }
      this.maybeSetOnClick_($('about-done'), function() {
        // Event listener for the close button when shown as an overlay.
        PageManager.closeOverlay();
      });

      var self = this;
      var channelChanger = $('channel-changer');
      if (channelChanger) {
        channelChanger.onchange = function(event) {
          self.setChannel_(event.target.value, false);
        };
      }

      if (cr.isChromeOS) {
        // Add event listener for the check for and apply updates button.
        this.maybeSetOnClick_($('request-update'), function() {
          self.setUpdateStatus_('checking');
          $('request-update').disabled = true;
          chrome.send('requestUpdate');
        });

        $('change-channel').onclick = function() {
          PageManager.showPageByName('channel-change-page', false);
        };

        var channelChangeDisallowedError = document.createElement('div');
        channelChangeDisallowedError.className = 'channel-change-error-bubble';

        var channelChangeDisallowedIcon = document.createElement('div');
        channelChangeDisallowedIcon.className =
            'help-page-icon channel-change-error-icon';
        channelChangeDisallowedError.appendChild(channelChangeDisallowedIcon);

        var channelChangeDisallowedText = document.createElement('div');
        channelChangeDisallowedText.className = 'channel-change-error-text';
        channelChangeDisallowedText.textContent =
            loadTimeData.getString('channelChangeDisallowedMessage');
        channelChangeDisallowedError.appendChild(channelChangeDisallowedText);

        $('channel-change-disallowed-icon').onclick = function() {
          PageManager.showBubble(channelChangeDisallowedError,
                                 $('channel-change-disallowed-icon'),
                                 $('help-container'),
                                 cr.ui.ArrowLocation.TOP_END);
        };

        // Unhide the regulatory label if/when the image loads.
        $('regulatory-label').onload = function() {
          $('regulatory-label-container').hidden = false;
        };
      }

      var logo = $('product-logo');
      logo.onclick = function(e) {
        logo.classList.remove('spin');
        // Force a style recalc that cancels the animation specified by "spin".
        getComputedStyle(logo).getPropertyValue('animation-name');
        logo.classList.add('spin');
      };

      // Attempt to update.
      chrome.send('onPageLoaded');
    },

    /** @override */
    didClosePage: function() {
      this.setMoreInfoVisible_(false);
    },

    /**
     * Sets the visible state of the 'More Info' section.
     * @param {boolean} visible Whether the section should be visible.
     * @private
     */
    setMoreInfoVisible_: function(visible) {
      var moreInfo = $('more-info-container');
      if (!moreInfo || visible == moreInfo.classList.contains('visible'))
        return;

      moreInfo.classList.toggle('visible', visible);
      moreInfo.style.height = visible ? moreInfo.scrollHeight + 'px' : '';
      moreInfo.addEventListener('webkitTransitionEnd', function(event) {
        $('more-info-expander').textContent = visible ?
            loadTimeData.getString('hideMoreInfo') :
            loadTimeData.getString('showMoreInfo');
      });
    },

    /**
     * Toggles the visible state of the 'More Info' section.
     * @private
     */
    toggleMoreInfo_: function() {
      var moreInfo = $('more-info-container');
      this.setMoreInfoVisible_(!moreInfo.classList.contains('visible'));
    },

    /**
     * Assigns |method| to the onclick property of |el| if |el| exists.
     * @param {HTMLElement} el The element on which to set the click handler.
     * @param {Function} method The click handler.
     * @private
     */
    maybeSetOnClick_: function(el, method) {
      if (el)
        el.onclick = method;
    },

    /**
     * @param {string} state The state of the update.
     * private
     */
    setUpdateImage_: function(state) {
      $('update-status-icon').className = 'help-page-icon ' + state;
    },

    /**
     * @return {boolean} True, if new channel switcher UI is used,
     *    false otherwise.
     * @private
     */
    isNewChannelSwitcherUI_: function() {
      return !loadTimeData.valueExists('disableNewChannelSwitcherUI');
    },

    /**
     * @return {boolean} True if target and current channels are not null and
     *     not equal.
     * @private
     */
    channelsDiffer_: function() {
      var current = this.currentChannel_;
      var target = this.targetChannel_;
      return (current != null && target != null && current != target);
    },

    /**
     * @return {boolean} True if target channel is more stable than the current
     *     one, and false otherwise.
     * @private
     */
    targetChannelIsMoreStable_: function() {
      var current = this.currentChannel_;
      var target = this.targetChannel_;
      if (current == null || target == null)
        return false;
      var currentIndex = this.channelList_.indexOf(current);
      var targetIndex = this.channelList_.indexOf(target);
      if (currentIndex < 0 || targetIndex < 0)
        return false;
      return currentIndex < targetIndex;
    },

    /**
     * @param {string} status The status of the update.
     * @param {string} message Failure message to display.
     * @private
     */
    setUpdateStatus_: function(status, message) {
      this.status_ = status;
      this.message_ = message;

      this.updateUI_();
    },

    /**
      * Updates UI elements on the page according to current state.
      * @private
      */
    updateUI_: function() {
      var status = this.status_;
      var message = this.message_;
      var channel = this.targetChannel_;

      if (this.channelList_.indexOf(channel) >= 0) {
        $('current-channel').textContent = loadTimeData.getStringF(
            'currentChannel', this.channelTable_[channel].label);
        this.updateChannelChangePageContainerVisibility_();
      }

      if (status == null)
        return;

      if (cr.isMac &&
          $('update-status-message') &&
          $('update-status-message').hidden) {
        // Chrome has reached the end of the line on this system. The
        // update-obsolete-system message is displayed. No other auto-update
        // status should be displayed.
        return;
      }

      if (status == 'checking') {
        this.setUpdateImage_('working');
        $('update-status-message').innerHTML =
            loadTimeData.getString('updateCheckStarted');
      } else if (status == 'updating') {
        this.setUpdateImage_('working');
        if (this.channelsDiffer_()) {
          $('update-status-message').innerHTML =
              loadTimeData.getStringF('updatingChannelSwitch',
                                      this.channelTable_[channel].label);
        } else {
          $('update-status-message').innerHTML =
              loadTimeData.getStringF('updating');
        }
      } else if (status == 'nearly_updated') {
        this.setUpdateImage_('up-to-date');
        if (this.channelsDiffer_()) {
          $('update-status-message').innerHTML =
              loadTimeData.getString('successfulChannelSwitch');
        } else {
          $('update-status-message').innerHTML =
              loadTimeData.getString('updateAlmostDone');
        }
      } else if (status == 'updated') {
        this.setUpdateImage_('up-to-date');
        $('update-status-message').innerHTML =
            loadTimeData.getString('upToDate');
      } else if (status == 'failed') {
        this.setUpdateImage_('failed');
        $('update-status-message').innerHTML = message;
      } else if (status == 'disabled_by_admin') {
        this.setUpdateImage_('disabled-by-admin');
        $('update-status-message').innerHTML = message;
      }

      if (cr.isChromeOS) {
        $('change-channel').disabled = !this.can_change_channel_ ||
            status == 'nearly_updated';
        $('channel-change-disallowed-icon').hidden = this.can_change_channel_;
      }

      // Following invariant must be established at the end of this function:
      // { ~$('relaunch_and_powerwash').hidden -> $('relaunch').hidden }
      var relaunchAndPowerwashHidden = true;
      if ($('relaunch-and-powerwash')) {
        // It's allowed to do powerwash only for customer devices,
        // when user explicitly decides to update to a more stable
        // channel.
        relaunchAndPowerwashHidden =
            !this.targetChannelIsMoreStable_() || status != 'nearly_updated';
        $('relaunch-and-powerwash').hidden = relaunchAndPowerwashHidden;
      }

      if (cr.isChromeOS) {
        // Only enable the update button if it hasn't been used yet or the
        // status isn't 'updated'.
        if (!$('request-update').disabled || status != 'updated') {
          // Disable the button if an update is already in progress.
          $('request-update').disabled =
            ['checking', 'updating', 'nearly_updated'].indexOf(status) > -1;
        }
      }

      var container = $('update-status-container');
      if (container) {
        container.hidden = status == 'disabled';
        $('relaunch').hidden =
            (status != 'nearly_updated') || !relaunchAndPowerwashHidden;

        if (cr.isChromeOS) {
          // Assume the "updated" status is stale if we haven't checked yet.
          if (status == 'updated' && !$('request-update').disabled)
            container.hidden = true;

          // Hide the request update button if auto-updating is disabled or
          // a relaunch button is showing.
          $('request-update').hidden = status == 'disabled' ||
            !$('relaunch').hidden || !relaunchAndPowerwashHidden;
        }

        if (!cr.isMac)
          $('update-percentage').hidden = status != 'updating';
      }
    },

    /**
     * @param {number} progress The percent completion.
     * @private
     */
    setProgress_: function(progress) {
      $('update-percentage').innerHTML = progress + '%';
    },

    /**
     * @param {string} message The allowed connection types message.
     * @private
     */
    setAllowedConnectionTypesMsg_: function(message) {
      $('allowed-connection-types-message').innerText = message;
    },

    /**
     * @param {boolean} visible Whether to show the message.
     * @private
     */
    showAllowedConnectionTypesMsg_: function(visible) {
      $('allowed-connection-types-message').hidden = !visible;
    },

    /**
     * @param {string} state The promote state to set.
     * @private
     */
    setPromotionState_: function(state) {
      if (state == 'hidden') {
        $('promote').hidden = true;
      } else if (state == 'enabled') {
        $('promote').disabled = false;
        $('promote').hidden = false;
      } else if (state == 'disabled') {
        $('promote').disabled = true;
        $('promote').hidden = false;
      }
    },

    /**
     * @param {boolean} obsolete Whether the system is obsolete.
     * @private
     */
    setObsoleteSystem_: function(obsolete) {
      if ($('update-obsolete-system-container')) {
        $('update-obsolete-system-container').hidden = !obsolete;
      }
    },

    /**
     * @param {boolean} endOfTheLine Whether the train has rolled into
     *     the station.
     * @private
     */
    setObsoleteSystemEndOfTheLine_: function(endOfTheLine) {
      if ($('update-obsolete-system-container') &&
          !$('update-obsolete-system-container').hidden &&
          $('update-status-message')) {
        $('update-status-message').hidden = endOfTheLine;
        if (endOfTheLine) {
          this.setUpdateImage_('failed');
        }
      }
    },

    /**
     * @param {string} version Version of Chrome OS.
     * @private
     */
    setOSVersion_: function(version) {
      if (!cr.isChromeOS)
        console.error('OS version unsupported on non-CrOS');

      $('os-version').parentNode.hidden = (version == '');
      $('os-version').textContent = version;
    },

    /**
     * @param {string} firmware Firmware on Chrome OS.
     * @private
     */
    setOSFirmware_: function(firmware) {
      if (!cr.isChromeOS)
        console.error('OS firmware unsupported on non-CrOS');

      $('firmware').parentNode.hidden = (firmware == '');
      $('firmware').textContent = firmware;
    },

    /**
     * Updates page UI according to device owhership policy.
     * @param {boolean} isEnterpriseManaged True if the device is
     *     enterprise managed.
     * @private
     */
    updateIsEnterpriseManaged_: function(isEnterpriseManaged) {
      help.ChannelChangePage.updateIsEnterpriseManaged(isEnterpriseManaged);
      this.updateUI_();
    },

    /**
     * Updates name of the current channel, i.e. the name of the
     * channel the device is currently on.
     * @param {string} channel The name of the current channel.
     * @private
     */
    updateCurrentChannel_: function(channel) {
      if (this.channelList_.indexOf(channel) < 0)
        return;
      this.currentChannel_ = channel;
      help.ChannelChangePage.updateCurrentChannel(channel);
      this.updateUI_();
    },

    /**
     * Updates name of the target channel, i.e. the name of the
     * channel the device is supposed to be.
     * @param {string} channel The name of the target channel.
     * @private
     */
    updateTargetChannel_: function(channel) {
      if (this.channelList_.indexOf(channel) < 0)
        return;
      this.targetChannel_ = channel;
      help.ChannelChangePage.updateTargetChannel(channel);
      this.updateUI_();
    },

    /**
     * @param {boolean} enabled True if the release channel can be enabled.
     * @private
     */
    updateEnableReleaseChannel_: function(enabled) {
      this.updateChannelChangerContainerVisibility_(enabled);
      this.can_change_channel_ = enabled;
      this.updateUI_();
    },

    /**
     * Sets the device target channel.
     * @param {string} channel The name of the target channel.
     * @param {boolean} isPowerwashAllowed True iff powerwash is allowed.
     * @private
     */
    setChannel_: function(channel, isPowerwashAllowed) {
      chrome.send('setChannel', [channel, isPowerwashAllowed]);
      $('channel-change-confirmation').hidden = false;
      $('channel-change-confirmation').textContent = loadTimeData.getStringF(
          'channel-changed', this.channelTable_[channel].name);
      this.updateTargetChannel_(channel);
    },

    /**
     * Sets the value of the "Build Date" field of the "More Info" section.
     * @param {string} buildDate The date of the build.
     * @private
     */
    setBuildDate_: function(buildDate) {
      $('build-date-container').classList.remove('empty');
      $('build-date').textContent = buildDate;
    },

    /**
     * Updates channel-change-page-container visibility according to
     * internal state.
     * @private
     */
    updateChannelChangePageContainerVisibility_: function() {
      if (!this.isNewChannelSwitcherUI_()) {
        $('channel-change-page-container').hidden = true;
        return;
      }
      $('channel-change-page-container').hidden =
          !help.ChannelChangePage.isPageReady();
    },

    /**
     * Updates channel-changer dropdown visibility if |visible| is
     * true and new channel switcher UI is disallowed.
     * @param {boolean} visible True if channel-changer should be
     *     displayed, false otherwise.
     * @private
     */
    updateChannelChangerContainerVisibility_: function(visible) {
      if (this.isNewChannelSwitcherUI_()) {
        $('channel-changer').hidden = true;
        return;
      }
      $('channel-changer').hidden = !visible;
    },

    /**
     * Sets the regulatory label's source.
     * @param {string} path The path to use for the image.
     * @private
     */
    setRegulatoryLabelPath_: function(path) {
      $('regulatory-label').src = path;
    },

    /**
     * Sets the regulatory label's alt text.
     * @param {string} text The text to use for the image.
     * @private
     */
    setRegulatoryLabelText_: function(text) {
      $('regulatory-label').alt = text;
    },
  };

  HelpPage.setUpdateStatus = function(status, message) {
    HelpPage.getInstance().setUpdateStatus_(status, message);
  };

  HelpPage.setProgress = function(progress) {
    HelpPage.getInstance().setProgress_(progress);
  };

  HelpPage.setAndShowAllowedConnectionTypesMsg = function(message) {
    HelpPage.getInstance().setAllowedConnectionTypesMsg_(message);
    HelpPage.getInstance().showAllowedConnectionTypesMsg_(true);
  };

  HelpPage.showAllowedConnectionTypesMsg = function(visible) {
    HelpPage.getInstance().showAllowedConnectionTypesMsg_(visible);
  };

  HelpPage.setPromotionState = function(state) {
    HelpPage.getInstance().setPromotionState_(state);
  };

  HelpPage.setObsoleteSystem = function(obsolete) {
    HelpPage.getInstance().setObsoleteSystem_(obsolete);
  };

  HelpPage.setObsoleteSystemEndOfTheLine = function(endOfTheLine) {
    HelpPage.getInstance().setObsoleteSystemEndOfTheLine_(endOfTheLine);
  };

  HelpPage.setOSVersion = function(version) {
    HelpPage.getInstance().setOSVersion_(version);
  };

  HelpPage.setOSFirmware = function(firmware) {
    HelpPage.getInstance().setOSFirmware_(firmware);
  };

  HelpPage.updateIsEnterpriseManaged = function(isEnterpriseManaged) {
    if (!cr.isChromeOS)
      return;
    HelpPage.getInstance().updateIsEnterpriseManaged_(isEnterpriseManaged);
  };

  HelpPage.updateCurrentChannel = function(channel) {
    if (!cr.isChromeOS)
      return;
    HelpPage.getInstance().updateCurrentChannel_(channel);
  };

  HelpPage.updateTargetChannel = function(channel) {
    if (!cr.isChromeOS)
      return;
    HelpPage.getInstance().updateTargetChannel_(channel);
  };

  HelpPage.updateEnableReleaseChannel = function(enabled) {
    HelpPage.getInstance().updateEnableReleaseChannel_(enabled);
  };

  HelpPage.setChannel = function(channel, isPowerwashAllowed) {
    HelpPage.getInstance().setChannel_(channel, isPowerwashAllowed);
  };

  HelpPage.setBuildDate = function(buildDate) {
    HelpPage.getInstance().setBuildDate_(buildDate);
  };

  HelpPage.setRegulatoryLabelPath = function(path) {
    assert(cr.isChromeOS);
    HelpPage.getInstance().setRegulatoryLabelPath_(path);
  };

  HelpPage.setRegulatoryLabelText = function(text) {
    assert(cr.isChromeOS);
    HelpPage.getInstance().setRegulatoryLabelText_(text);
  };

  // Export
  return {
    HelpPage: HelpPage
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.exportPath('options');

/** @typedef {{appsEnforced: boolean,
 *             appsRegistered: boolean,
 *             appsSynced: boolean,
 *             autofillEnforced: boolean,
 *             autofillRegistered: boolean,
 *             autofillSynced: boolean,
 *             bookmarksEnforced: boolean,
 *             bookmarksRegistered: boolean,
 *             bookmarksSynced: boolean,
 *             encryptAllData: boolean,
 *             encryptAllDataAllowed: boolean,
 *             enterGooglePassphraseBody: (string|undefined),
 *             enterPassphraseBody: (string|undefined),
 *             extensionsEnforced: boolean,
 *             extensionsRegistered: boolean,
 *             extensionsSynced: boolean,
 *             fullEncryptionBody: string,
 *             passphraseFailed: boolean,
 *             passwordsEnforced: boolean,
 *             passwordsRegistered: boolean,
 *             passwordsSynced: boolean,
 *             paymentsIntegrationEnabled: boolean,
 *             preferencesEnforced: boolean,
 *             preferencesRegistered: boolean,
 *             preferencesSynced: boolean,
 *             showPassphrase: boolean,
 *             syncAllDataTypes: boolean,
 *             syncNothing: boolean,
 *             tabsEnforced: boolean,
 *             tabsRegistered: boolean,
 *             tabsSynced: boolean,
 *             themesEnforced: boolean,
 *             themesRegistered: boolean,
 *             themesSynced: boolean,
 *             typedUrlsEnforced: boolean,
 *             typedUrlsRegistered: boolean,
 *             typedUrlsSynced: boolean,
 *             usePassphrase: boolean,
 *             wifiCredentialsEnforced: (boolean|undefined),
 *             wifiCredentialsSynced: (boolean|undefined)}}
 */
var SyncConfig;

/**
 * The user's selection in the synced data type drop-down menu, as an index.
 * @enum {number}
 * @const
 */
options.DataTypeSelection = {
  SYNC_EVERYTHING: 0,
  CHOOSE_WHAT_TO_SYNC: 1,
  SYNC_NOTHING: 2
};

cr.define('options', function() {
  /** @const */ var Page = cr.ui.pageManager.Page;
  /** @const */ var PageManager = cr.ui.pageManager.PageManager;

  /**
   * SyncSetupOverlay class
   * Encapsulated handling of the 'Sync Setup' overlay page.
   * @class
   */
  function SyncSetupOverlay() {
    Page.call(this, 'syncSetup',
              loadTimeData.getString('syncSetupOverlayTabTitle'),
              'sync-setup-overlay');
  }

  cr.addSingletonGetter(SyncSetupOverlay);

  SyncSetupOverlay.prototype = {
    __proto__: Page.prototype,

    /**
     * True if the synced account uses a custom passphrase.
     * @private {boolean}
     */
    usePassphrase_: false,

    /**
     * True if the synced account uses 'encrypt everything'.
     * @private {boolean}
     */
    useEncryptEverything_: false,

    /**
     * An object used as a cache of the arguments passed in while initially
     * displaying the advanced sync settings dialog. Used to switch between the
     * options in the main drop-down menu. Reset when the dialog is closed.
     * @private {?SyncConfig}
     */
    syncConfigureArgs_: null,

    /**
     * A dictionary that maps the sync data type checkbox names to their checked
     * state. Initialized when the advanced settings dialog is first brought up,
     * updated any time a box is checked / unchecked, and reset when the dialog
     * is closed. Used to restore checkbox state while switching between the
     * options in the main drop-down menu. All checkboxes are checked and
     * disabled when the "Sync everything" menu-item is selected, and unchecked
     * and disabled when "Sync nothing" is selected. When "Choose what to sync"
     * is selected, the boxes are restored to their most recent checked state
     * from this cache.
     * @private {Object}
     */
    dataTypeBoxesChecked_: {},

    /**
     * A dictionary that maps the sync data type checkbox names to their
     * disabled state (when a data type is enabled programmatically without user
     * choice).  Initialized when the advanced settings dialog is first brought
     * up, and reset when the dialog is closed.
     * @private {Object}
     */
    dataTypeBoxesDisabled_: {},

    /** @override */
    initializePage: function() {
      Page.prototype.initializePage.call(this);

      var self = this;

      // If 'profilesInfo' doesn't exist, it's forbidden to delete profile.
      // So don't display the delete-profile checkbox.
      if (!loadTimeData.valueExists('profilesInfo') &&
          $('sync-setup-delete-profile')) {
        $('sync-setup-delete-profile').hidden = true;
      }

      $('basic-encryption-option').onchange =
          $('full-encryption-option').onchange = function() {
        self.onEncryptionRadioChanged_();
      };
      $('choose-datatypes-cancel').onclick =
          $('confirm-everything-cancel').onclick =
          $('stop-syncing-cancel').onclick =
          $('sync-spinner-cancel').onclick = function() {
        self.closeOverlay_();
      };
      $('confirm-everything-ok').onclick = function() {
        self.sendConfiguration_();
      };
      $('timeout-ok').onclick = function() {
        chrome.send('CloseTimeout');
        self.closeOverlay_();
      };
      $('stop-syncing-ok').onclick = function() {
        var deleteProfile = $('delete-profile') != undefined &&
            $('delete-profile').checked;
        chrome.send('SyncSetupStopSyncing', [deleteProfile]);
        self.closeOverlay_();
      };
      $('use-default-link').onclick = function() {
        self.showSyncEverythingPage_();
      };
      $('autofill-checkbox').onclick = function() {
        var autofillSyncEnabled = $('autofill-checkbox').checked;
        $('payments-integration-checkbox').checked = autofillSyncEnabled;
        $('payments-integration-checkbox').disabled = !autofillSyncEnabled;
      };
    },

    /** @private */
    showOverlay_: function() {
      PageManager.showPageByName('syncSetup');
    },

    /** @private */
    closeOverlay_: function() {
      this.syncConfigureArgs_ = null;
      this.dataTypeBoxesChecked_ = {};
      this.dataTypeBoxesDisabled_ = {};

      var overlay = $('sync-setup-overlay');
      if (!overlay.hidden)
        PageManager.closeOverlay();
    },

    /** @override */
    didShowPage: function() {
      chrome.send('SyncSetupShowSetupUI');
    },

    /** @override */
    didClosePage: function() {
      chrome.send('SyncSetupDidClosePage');
    },

    /** @private */
    onEncryptionRadioChanged_: function() {
      var visible = $('full-encryption-option').checked;
      // TODO(dbeam): should sync-custom-passphrase-container be hidden instead?
      $('sync-custom-passphrase').hidden = !visible;
      chrome.send('coreOptionsUserMetricsAction',
                  ['Options_SyncSetEncryption']);
    },

    /**
     * Sets the checked state of the individual sync data type checkboxes in the
     * advanced sync settings dialog.
     * @param {boolean} value True for checked, false for unchecked.
     * @private
     */
    checkAllDataTypeCheckboxes_: function(value) {
      // Only check / uncheck the visible ones (since there's no way to uncheck
      // / check the invisible ones).
      var checkboxes = $('choose-data-types-body').querySelectorAll(
          '.sync-type-checkbox:not([hidden]) input');
      for (var i = 0; i < checkboxes.length; i++) {
        checkboxes[i].checked = value;
      }
      $('payments-integration-checkbox').checked = value;
    },

    /**
     * Restores the checked states of the sync data type checkboxes in the
     * advanced sync settings dialog. Called when "Choose what to sync" is
     * selected. Required because all the checkboxes are checked when
     * "Sync everything" is selected, and unchecked when "Sync nothing" is
     * selected. Note: We only restore checkboxes for data types that are
     * actually visible and whose old values are found in the cache, since it's
     * possible for some data types to not be registered, and therefore, their
     * checkboxes remain hidden, and never get cached.
     * @private
     */
    restoreDataTypeCheckboxes_: function() {
      for (var dataType in this.dataTypeBoxesChecked_) {
        $(dataType).checked = this.dataTypeBoxesChecked_[dataType];
      }
    },

    /**
     * Enables / grays out the sync data type checkboxes in the advanced
     * settings dialog.
     * @param {boolean} enabled True for enabled, false for grayed out.
     * @private
     */
    setDataTypeCheckboxesEnabled_: function(enabled) {
      for (var dataType in this.dataTypeBoxesDisabled_) {
        $(dataType).disabled =
            !enabled || this.dataTypeBoxesDisabled_[dataType];
      }
    },

    /**
     * Sets the state of the sync data type checkboxes based on whether "Sync
     * everything", "Choose what to sync", or "Sync nothing" are selected in the
     * drop-down menu of the advanced settings dialog.
     * @param {options.DataTypeSelection} selectedIndex Index of user's
     *     selection.
     * @private
     */
    setDataTypeCheckboxes_: function(selectedIndex) {
      if (selectedIndex == options.DataTypeSelection.CHOOSE_WHAT_TO_SYNC) {
        this.setDataTypeCheckboxesEnabled_(true);
        this.restoreDataTypeCheckboxes_();
      } else {
        this.setDataTypeCheckboxesEnabled_(false);
        this.checkAllDataTypeCheckboxes_(
            selectedIndex == options.DataTypeSelection.SYNC_EVERYTHING);
      }
    },

    /** @private */
    checkPassphraseMatch_: function() {
      var emptyError = $('empty-error');
      var mismatchError = $('mismatch-error');
      emptyError.hidden = true;
      mismatchError.hidden = true;

      if (!$('full-encryption-option').checked ||
           $('basic-encryption-option').disabled) {
        return true;
      }

      var customPassphrase = $('custom-passphrase');
      if (customPassphrase.value.length == 0) {
        emptyError.hidden = false;
        return false;
      }

      var confirmPassphrase = $('confirm-passphrase');
      if (confirmPassphrase.value != customPassphrase.value) {
        mismatchError.hidden = false;
        return false;
      }

      return true;
    },

    /** @private */
    sendConfiguration_: function() {
      var encryptAllData = $('full-encryption-option').checked;

      var usePassphrase;
      var customPassphrase;
      var googlePassphrase = false;
      if (!$('sync-existing-passphrase-container').hidden) {
        // If we were prompted for an existing passphrase, use it.
        customPassphrase = getRequiredElement('passphrase').value;
        usePassphrase = true;
        // If we were displaying the 'enter your old google password' prompt,
        // then that means this is the user's google password.
        googlePassphrase = !$('google-passphrase-needed-body').hidden;
        // We allow an empty passphrase, in case the user has disabled
        // all their encrypted datatypes. In that case, the PSS will accept
        // the passphrase and finish configuration. If the user has enabled
        // encrypted datatypes, the PSS will prompt again specifying that the
        // passphrase failed.
      } else if (!$('basic-encryption-option').disabled &&
                  $('full-encryption-option').checked) {
        // The user is setting a custom passphrase for the first time.
        if (!this.checkPassphraseMatch_())
          return;
        customPassphrase = $('custom-passphrase').value;
        usePassphrase = true;
      } else {
        // The user is not setting a custom passphrase.
        usePassphrase = false;
      }

      // Don't allow the user to tweak the settings once we send the
      // configuration to the backend.
      this.setInputElementsDisabledState_(true);
      $('use-default-link').hidden = true;

      // These values need to be kept in sync with where they are read in
      // sync_setup_handler.cc:GetConfiguration().
      var syncAll = $('sync-select-datatypes').selectedIndex ==
                    options.DataTypeSelection.SYNC_EVERYTHING;
      var syncNothing = $('sync-select-datatypes').selectedIndex ==
                        options.DataTypeSelection.SYNC_NOTHING;
      var autofillSynced = syncAll || $('autofill-checkbox').checked;
      var result = JSON.stringify({
        'syncAllDataTypes': syncAll,
        'syncNothing': syncNothing,
        'bookmarksSynced': syncAll || $('bookmarks-checkbox').checked,
        'preferencesSynced': syncAll || $('preferences-checkbox').checked,
        'themesSynced': syncAll || $('themes-checkbox').checked,
        'passwordsSynced': syncAll || $('passwords-checkbox').checked,
        'autofillSynced': autofillSynced,
        'extensionsSynced': syncAll || $('extensions-checkbox').checked,
        'typedUrlsSynced': syncAll || $('typed-urls-checkbox').checked,
        'appsSynced': syncAll || $('apps-checkbox').checked,
        'tabsSynced': syncAll || $('tabs-checkbox').checked,
        'wifiCredentialsSynced':
            syncAll || $('wifi-credentials-checkbox').checked,
        'paymentsIntegrationEnabled': syncAll ||
            (autofillSynced && $('payments-integration-checkbox').checked),
        'encryptAllData': encryptAllData,
        'usePassphrase': usePassphrase,
        'isGooglePassphrase': googlePassphrase,
        'passphrase': customPassphrase
      });
      chrome.send('SyncSetupConfigure', [result]);
    },

    /**
     * Sets the disabled property of all input elements within the 'Customize
     * Sync Preferences' screen. This is used to prohibit the user from changing
     * the inputs after confirming the customized sync preferences, or resetting
     * the state when re-showing the dialog.
     * @param {boolean} disabled True if controls should be set to disabled.
     * @private
     */
    setInputElementsDisabledState_: function(disabled) {
      var self = this;
      var configureElements =
          $('customize-sync-preferences').querySelectorAll('input');
      for (var i = 0; i < configureElements.length; i++)
        configureElements[i].disabled = disabled;
      $('sync-select-datatypes').disabled = disabled;
      $('payments-integration-checkbox').disabled = disabled;

      $('customize-link').hidden = disabled;
      $('customize-link').disabled = disabled;
      $('customize-link').onclick = disabled ? null : function() {
        SyncSetupOverlay.showCustomizePage(self.syncConfigureArgs_,
            options.DataTypeSelection.SYNC_EVERYTHING);
        return false;
      };
    },

    /**
     * Shows or hides the sync data type checkboxes in the advanced sync
     * settings dialog. Also initializes |this.dataTypeBoxesChecked_| and
     * |this.dataTypeBoxedDisabled_| with their values, and makes their onclick
     * handlers update |this.dataTypeBoxesChecked_|.
     * @param {SyncConfig} args The configuration data used to show/hide UI.
     * @private
     */
    setChooseDataTypesCheckboxes_: function(args) {
      var datatypeSelect = $('sync-select-datatypes');
      datatypeSelect.selectedIndex = args.syncAllDataTypes ?
          options.DataTypeSelection.SYNC_EVERYTHING :
          options.DataTypeSelection.CHOOSE_WHAT_TO_SYNC;

      $('bookmarks-checkbox').checked = args.bookmarksSynced;
      this.dataTypeBoxesChecked_['bookmarks-checkbox'] = args.bookmarksSynced;
      this.dataTypeBoxesDisabled_['bookmarks-checkbox'] =
          args.bookmarksEnforced;

      $('preferences-checkbox').checked = args.preferencesSynced;
      this.dataTypeBoxesChecked_['preferences-checkbox'] =
          args.preferencesSynced;
      this.dataTypeBoxesDisabled_['preferences-checkbox'] =
          args.preferencesEnforced;

      $('themes-checkbox').checked = args.themesSynced;
      this.dataTypeBoxesChecked_['themes-checkbox'] = args.themesSynced;
      this.dataTypeBoxesDisabled_['themes-checkbox'] = args.themesEnforced;

      if (args.passwordsRegistered) {
        $('passwords-checkbox').checked = args.passwordsSynced;
        this.dataTypeBoxesChecked_['passwords-checkbox'] = args.passwordsSynced;
        this.dataTypeBoxesDisabled_['passwords-checkbox'] =
            args.passwordsEnforced;
        $('passwords-item').hidden = false;
      } else {
        $('passwords-item').hidden = true;
      }
      if (args.autofillRegistered) {
        $('autofill-checkbox').checked = args.autofillSynced;
        this.dataTypeBoxesChecked_['autofill-checkbox'] = args.autofillSynced;
        this.dataTypeBoxesDisabled_['autofill-checkbox'] =
            args.autofillEnforced;
        this.dataTypeBoxesChecked_['payments-integration-checkbox'] =
            args.autofillSynced && args.paymentsIntegrationEnabled;
        this.dataTypeBoxesDisabled_['payments-integration-checkbox'] =
            !args.autofillSynced;
        $('autofill-item').hidden = false;
        $('payments-integration-setting-area').hidden = false;
      } else {
        $('autofill-item').hidden = true;
        $('payments-integration-setting-area').hidden = true;
      }
      if (args.extensionsRegistered) {
        $('extensions-checkbox').checked = args.extensionsSynced;
        this.dataTypeBoxesChecked_['extensions-checkbox'] =
            args.extensionsSynced;
        this.dataTypeBoxesDisabled_['extensions-checkbox'] =
            args.extensionsEnforced;
        $('extensions-item').hidden = false;
      } else {
        $('extensions-item').hidden = true;
      }
      if (args.typedUrlsRegistered) {
        $('typed-urls-checkbox').checked = args.typedUrlsSynced;
        this.dataTypeBoxesChecked_['typed-urls-checkbox'] =
            args.typedUrlsSynced;
        this.dataTypeBoxesDisabled_['typed-urls-checkbox'] =
            args.typedUrlsEnforced;
        $('omnibox-item').hidden = false;
      } else {
        $('omnibox-item').hidden = true;
      }
      if (args.appsRegistered) {
        $('apps-checkbox').checked = args.appsSynced;
        this.dataTypeBoxesChecked_['apps-checkbox'] = args.appsSynced;
        this.dataTypeBoxesDisabled_['apps-checkbox'] = args.appsEnforced;
        $('apps-item').hidden = false;
      } else {
        $('apps-item').hidden = true;
      }
      if (args.tabsRegistered) {
        $('tabs-checkbox').checked = args.tabsSynced;
        this.dataTypeBoxesChecked_['tabs-checkbox'] = args.tabsSynced;
        this.dataTypeBoxesDisabled_['tabs-checkbox'] = args.tabsEnforced;
        $('tabs-item').hidden = false;
      } else {
        $('tabs-item').hidden = true;
      }
      if (args.wifiCredentialsRegistered) {
        $('wifi-credentials-checkbox').checked = args.wifiCredentialsSynced;
        this.dataTypeBoxesChecked_['wifi-credentials-checkbox'] =
            args.wifiCredentialsSynced;
        this.dataTypeBoxesDisabled_['wifi-credentials-checkbox'] =
            args.wifiCredentialsEnforced;
        $('wifi-credentials-item').hidden = false;
      } else {
        $('wifi-credentials-item').hidden = true;
      }

      $('choose-data-types-body').onchange =
          this.handleDataTypeChange_.bind(this);

      this.setDataTypeCheckboxes_(datatypeSelect.selectedIndex);
    },

    /**
     * Updates the cached values of the sync data type checkboxes stored in
     * |this.dataTypeBoxesChecked_|. Used as an onclick handler for each data
     * type checkbox.
     * @param {Event} e The change event.
     * @private
     */
    handleDataTypeChange_: function(e) {
      var input = assertInstanceof(e.target, HTMLInputElement);
      assert(input.type == 'checkbox');
      this.dataTypeBoxesChecked_[input.id] = input.checked;
      chrome.send('coreOptionsUserMetricsAction',
                  ['Options_SyncToggleDataType']);
    },

    /**
     * @param {SyncConfig} args
     * @private
     */
    setEncryptionRadios_: function(args) {
      if (!args.encryptAllData && !args.usePassphrase) {
        $('basic-encryption-option').checked = true;
      } else {
        $('full-encryption-option').checked = true;
        $('full-encryption-option').disabled = true;
        $('basic-encryption-option').disabled = true;
      }
    },

    /**
     * @param {SyncConfig} args
     * @private
     */
    setCheckboxesAndErrors_: function(args) {
      this.setChooseDataTypesCheckboxes_(args);
      this.setEncryptionRadios_(args);
    },

    /**
     * @param {SyncConfig} args
     * @private
     */
    showConfigure_: function(args) {
      var datatypeSelect = $('sync-select-datatypes');
      var self = this;

      // Cache the sync config args so they can be reused when we transition
      // between the drop-down menu items in the advanced settings dialog.
      if (args)
        this.syncConfigureArgs_ = args;

      // Once the advanced sync settings dialog is visible, we transition
      // between its drop-down menu items as follows:
      // "Sync everything": Show encryption and passphrase sections, and disable
      // and check all data type checkboxes.
      // "Sync nothing": Hide encryption and passphrase sections, and disable
      // and uncheck all data type checkboxes.
      // "Choose what to sync": Show encryption and passphrase sections, enable
      // data type checkboxes, and restore their checked state to the last time
      // the "Choose what to sync" was selected while the dialog was still up.
      datatypeSelect.onchange = function() {
        if (this.selectedIndex == options.DataTypeSelection.SYNC_NOTHING) {
          self.showSyncNothingPage_();
        } else {
          self.showCustomizePage_(self.syncConfigureArgs_, this.selectedIndex);
          if (this.selectedIndex == options.DataTypeSelection.SYNC_EVERYTHING)
            self.checkAllDataTypeCheckboxes_(true);
          else
            self.restoreDataTypeCheckboxes_();
        }
      };

      this.resetPage_('sync-setup-configure');
      $('sync-setup-configure').hidden = false;

      // onsubmit is changed when submitting a passphrase. Reset it to its
      // default.
      $('choose-data-types-form').onsubmit = function() {
        self.sendConfiguration_();
        return false;
      };

      if (args) {
        this.setCheckboxesAndErrors_(args);

        this.useEncryptEverything_ = args.encryptAllData;

        // Determine whether to display the 'OK, sync everything' confirmation
        // dialog or the advanced sync settings dialog, and assign focus to the
        // OK button, or to the passphrase field if a passphrase is required.
        this.usePassphrase_ = args.usePassphrase;
        var index = args.syncAllDataTypes ?
                        options.DataTypeSelection.SYNC_EVERYTHING :
                        options.DataTypeSelection.CHOOSE_WHAT_TO_SYNC;
        this.showCustomizePage_(args, index);
      }
    },

    /** @private */
    showSpinner_: function() {
      this.resetPage_('sync-setup-spinner');
      $('sync-setup-spinner').hidden = false;
    },

    /** @private */
    showTimeoutPage_: function() {
      this.resetPage_('sync-setup-timeout');
      $('sync-setup-timeout').hidden = false;
    },

    /** @private */
    showSyncEverythingPage_: function() {
      chrome.send('coreOptionsUserMetricsAction',
                  ['Options_SyncSetDefault']);

      $('confirm-sync-preferences').hidden = false;
      $('customize-sync-preferences').hidden = true;

      // Reset the selection to 'Sync everything'.
      $('sync-select-datatypes').selectedIndex = 0;

      // The default state is to sync everything.
      this.setDataTypeCheckboxes_(options.DataTypeSelection.SYNC_EVERYTHING);

      // TODO(dbeam): should hide sync-custom-passphrase-container instead?
      if (!this.usePassphrase_)
        $('sync-custom-passphrase').hidden = true;

      if (!this.useEncryptEverything_ && !this.usePassphrase_)
        $('basic-encryption-option').checked = true;
    },

    /**
     * Reveals the UI for when the user chooses not to sync any data types.
     * This happens when the user signs in and selects "Sync nothing" in the
     * advanced sync settings dialog.
     * @private
     */
    showSyncNothingPage_: function() {
      // Reset the selection to 'Sync nothing'.
      $('sync-select-datatypes').selectedIndex =
          options.DataTypeSelection.SYNC_NOTHING;

      // Uncheck and disable the individual data type checkboxes.
      this.checkAllDataTypeCheckboxes_(false);
      this.setDataTypeCheckboxesEnabled_(false);

      // Hide the encryption section.
      $('customize-sync-encryption-new').hidden = true;
      $('sync-custom-passphrase-container').hidden = true;
      $('sync-existing-passphrase-container').hidden = true;

      // Hide the "use default settings" link.
      $('use-default-link').hidden = true;
    },

    /**
     * Reveals the UI for entering a custom passphrase during initial setup.
     * This happens if the user has previously enabled a custom passphrase on a
     * different machine.
     * @param {SyncConfig} args The args that contain the passphrase UI
     *     configuration.
     * @private
     */
    showPassphraseContainer_: function(args) {
      // Once we require a passphrase, we prevent the user from returning to
      // the Sync Everything pane.
      $('use-default-link').hidden = true;
      $('sync-custom-passphrase-container').hidden = true;
      $('sync-existing-passphrase-container').hidden = false;

      // Hide the selection options within the new encryption section when
      // prompting for a passphrase.
      $('sync-new-encryption-section-container').hidden = true;

      $('normal-body').hidden = true;
      $('google-passphrase-needed-body').hidden = true;
      // Display the correct prompt to the user depending on what type of
      // passphrase is needed.
      if (args.usePassphrase)
        $('normal-body').hidden = false;
      else
        $('google-passphrase-needed-body').hidden = false;

      $('passphrase-learn-more').hidden = false;
      // Warn the user about their incorrect passphrase if we need a passphrase
      // and the passphrase field is non-empty (meaning they tried to set it
      // previously but failed).
      $('incorrect-passphrase').hidden =
          !(args.usePassphrase && args.passphraseFailed);

      $('sync-passphrase-warning').hidden = false;
    },

    /**
     * Displays the advanced sync setting dialog, and pre-selects either the
     * "Sync everything" or the "Choose what to sync" drop-down menu item.
     * @param {SyncConfig} args
     * @param {options.DataTypeSelection} index Index of item to pre-select.
     * @private
     */
    showCustomizePage_: function(args, index) {
      $('confirm-sync-preferences').hidden = true;
      $('customize-sync-preferences').hidden = false;

      $('sync-custom-passphrase-container').hidden = false;
      $('sync-new-encryption-section-container').hidden = false;
      $('customize-sync-encryption-new').hidden = !args.encryptAllDataAllowed;

      $('sync-existing-passphrase-container').hidden = true;

      $('sync-select-datatypes').selectedIndex = index;
      this.setDataTypeCheckboxesEnabled_(
          index == options.DataTypeSelection.CHOOSE_WHAT_TO_SYNC);

      if (args.showPassphrase) {
        this.showPassphraseContainer_(args);
        // TODO(dbeam): add an #updatePassphrase and only focus with that hash?
        $('passphrase').focus();
      } else {
        // We only show the 'Use Default' link if we're not prompting for an
        // existing passphrase.
        $('use-default-link').hidden = false;
      }
    },

    /**
     * Shows the appropriate sync setup page.
     * @param {string} page A page of the sync setup to show.
     * @param {SyncConfig} args Data from the C++ to forward on to the right
     *     section.
     */
    showSyncSetupPage_: function(page, args) {
      // If the user clicks the OK button, dismiss the dialog immediately, and
      // do not go through the process of hiding elements of the overlay.
      // See crbug.com/308873.
      if (page == 'done') {
        this.closeOverlay_();
        return;
      }

      this.setThrobbersVisible_(false);

      // Hide an existing visible overlay (ensuring the close button is not
      // hidden).
      var children = document.querySelectorAll(
          '#sync-setup-overlay > *:not(.close-button)');
      for (var i = 0; i < children.length; i++)
        children[i].hidden = true;

      this.setInputElementsDisabledState_(false);

      // If new passphrase bodies are present, overwrite the existing ones.
      if (args && args.enterPassphraseBody != undefined)
        $('normal-body').innerHTML = args.enterPassphraseBody;
      if (args && args.enterGooglePassphraseBody != undefined) {
        $('google-passphrase-needed-body').innerHTML =
            args.enterGooglePassphraseBody;
      }
      if (args && args.fullEncryptionBody != undefined)
        $('full-encryption-body').innerHTML = args.fullEncryptionBody;

      // NOTE: Because both showGaiaLogin_() and showConfigure_() change the
      // focus, we need to ensure that the overlay container and dialog aren't
      // [hidden] (as trying to focus() nodes inside of a [hidden] DOM section
      // doesn't work).
      this.showOverlay_();

      if (page == 'configure' || page == 'passphrase')
        this.showConfigure_(args);
      else if (page == 'spinner')
        this.showSpinner_();
      else if (page == 'timeout')
        this.showTimeoutPage_();
    },

    /**
     * Changes the visibility of throbbers on this page.
     * @param {boolean} visible Whether or not to set all throbber nodes
     *     visible.
     */
    setThrobbersVisible_: function(visible) {
      var throbbers = this.pageDiv.getElementsByClassName('throbber');
      for (var i = 0; i < throbbers.length; i++)
        throbbers[i].style.visibility = visible ? 'visible' : 'hidden';
    },

    /**
     * Reset the state of all descendant elements of a root element to their
     * initial state.
     * The initial state is specified by adding a class to the descendant
     * element in sync_setup_overlay.html.
     * @param {string} pageElementId The root page element id.
     * @private
     */
    resetPage_: function(pageElementId) {
      var page = $(pageElementId);
      var forEach = function(arr, fn) {
        var length = arr.length;
        for (var i = 0; i < length; i++) {
          fn(arr[i]);
        }
      };

      forEach(page.getElementsByClassName('reset-hidden'),
          function(elt) { elt.hidden = true; });
      forEach(page.getElementsByClassName('reset-shown'),
          function(elt) { elt.hidden = false; });
      forEach(page.getElementsByClassName('reset-disabled'),
          function(elt) { elt.disabled = true; });
      forEach(page.getElementsByClassName('reset-enabled'),
          function(elt) { elt.disabled = false; });
      forEach(page.getElementsByClassName('reset-value'),
          function(elt) { elt.value = ''; });
      forEach(page.getElementsByClassName('reset-opaque'),
          function(elt) { elt.classList.remove('transparent'); });
    },

    /**
     * Displays the stop syncing dialog.
     * @private
     */
    showStopSyncingUI_: function() {
      // Hide any visible children of the overlay.
      var overlay = $('sync-setup-overlay');
      for (var i = 0; i < overlay.children.length; i++)
        overlay.children[i].hidden = true;

      // Bypass PageManager.showPageByName because it will call didShowPage
      // which will set its own visible page, based on the flow state.
      this.visible = true;

      $('sync-setup-stop-syncing').hidden = false;
    },

    /**
     * Determines the appropriate page to show in the Sync Setup UI based on
     * the state of the Sync backend. Does nothing if the user is not signed in.
     * @private
     */
    showSetupUI_: function() {
      chrome.send('SyncSetupShowSetupUI');
      chrome.send('coreOptionsUserMetricsAction', ['Options_ShowSyncAdvanced']);
    },

    /**
     * Starts the signin process for the user. Does nothing if the user is
     * already signed in.
     * @private
     */
    startSignIn_: function(accessPoint) {
      chrome.send('SyncSetupStartSignIn', [accessPoint]);
    },

    /**
     * Forces user to sign out of Chrome for Chrome OS.
     * @private
     */
    doSignOutOnAuthError_: function() {
      chrome.send('SyncSetupDoSignOutOnAuthError');
    },
  };

  // Forward public APIs to private implementations.
  cr.makePublic(SyncSetupOverlay, [
    'closeOverlay',
    'showSetupUI',
    'startSignIn',
    'doSignOutOnAuthError',
    'showSyncSetupPage',
    'showCustomizePage',
    'showStopSyncingUI',
  ]);

  // Export
  return {
    SyncSetupOverlay: SyncSetupOverlay
  };
});


// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('uber', function() {
  var PageManager = cr.ui.pageManager.PageManager;

  /**
   * A PageManager observer that updates the uber page.
   * @constructor
   * @implements {cr.ui.pageManager.PageManager.Observer}
   */
  function PageManagerObserver() {}

  PageManagerObserver.prototype = {
    __proto__: PageManager.Observer.prototype,

    /**
     * Informs the uber page when a top-level overlay is opened or closed.
     * @param {cr.ui.pageManager.Page} page The page that is being shown or was
     *     hidden.
     * @override
     */
    onPageVisibilityChanged: function(page) {
      if (PageManager.isTopLevelOverlay(page)) {
        if (page.visible)
          uber.invokeMethodOnParent('beginInterceptingEvents');
        else
          uber.invokeMethodOnParent('stopInterceptingEvents');
      }
    },

    /**
     * Uses uber to set the title.
     * @param {string} title The title to set.
     * @override
     */
    updateTitle: function(title) {
      uber.setTitle(title);
    },

    /**
     * Pushes the current page onto the history stack, replacing the current
     * entry if appropriate.
     * @param {string} path The path of the page to push onto the stack.
     * @param {boolean} replace If true, allow no history events to be created.
     * @override
     */
    updateHistory: function(path, replace) {
      var historyFunction = replace ? uber.replaceState : uber.pushState;
      historyFunction({}, path);
    },
  };

  // Export
  return {
    PageManagerObserver: PageManagerObserver
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview A collection of utility methods for UberPage and its contained
 *     pages.
 */

cr.define('uber', function() {
  /**
   * Fixed position header elements on the page to be shifted by handleScroll.
   * @type {NodeList}
   */
  var headerElements;

  /**
   * This should be called by uber content pages when DOM content has loaded.
   */
  function onContentFrameLoaded() {
    headerElements = document.getElementsByTagName('header');
    document.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleMouseDownInFrame, true);

    invokeMethodOnParent('ready');

    // Prevent the navigation from being stuck in a disabled state when a
    // content page is reloaded while an overlay is visible (crbug.com/246939).
    invokeMethodOnParent('stopInterceptingEvents');

    // Trigger the scroll handler to tell the navigation if our page started
    // with some scroll (happens when you use tab restore).
    handleScroll();

    window.addEventListener('message', handleWindowMessage);
  }

  /**
   * Handles scroll events on the document. This adjusts the position of all
   * headers and updates the parent frame when the page is scrolled.
   */
  function handleScroll() {
    var scrollLeft = scrollLeftForDocument(document);
    var offset = scrollLeft * -1;
    for (var i = 0; i < headerElements.length; i++) {
      // As a workaround for http://crbug.com/231830, set the transform to
      // 'none' rather than 0px.
      headerElements[i].style.webkitTransform = offset ?
          'translateX(' + offset + 'px)' : 'none';
    }

    invokeMethodOnParent('adjustToScroll', scrollLeft);
  }

  /**
   * Tells the parent to focus the current frame if the mouse goes down in the
   * current frame (and it doesn't already have focus).
   * @param {Event} e A mousedown event.
   */
  function handleMouseDownInFrame(e) {
    if (!e.isSynthetic && !document.hasFocus())
      window.focus();
  }

  /**
   * Handles 'message' events on window.
   * @param {Event} e The message event.
   */
  function handleWindowMessage(e) {
    e = /** @type {!MessageEvent<!{method: string, params: *}>} */(e);
    if (e.data.method === 'frameSelected') {
      handleFrameSelected();
    } else if (e.data.method === 'mouseWheel') {
      handleMouseWheel(
          /** @type {{deltaX: number, deltaY: number}} */(e.data.params));
    } else if (e.data.method === 'mouseDown') {
      handleMouseDown();
    } else if (e.data.method === 'popState') {
      handlePopState(e.data.params.state, e.data.params.path);
    }
  }

  /**
   * This is called when a user selects this frame via the navigation bar
   * frame (and is triggered via postMessage() from the uber page).
   */
  function handleFrameSelected() {
    setScrollTopForDocument(document, 0);
  }

  /**
   * Called when a user mouse wheels (or trackpad scrolls) over the nav frame.
   * The wheel event is forwarded here and we scroll the body.
   * There's no way to figure out the actual scroll amount for a given delta.
   * It differs for every platform and even initWebKitWheelEvent takes a
   * pixel amount instead of a wheel delta. So we just choose something
   * reasonable and hope no one notices the difference.
   * @param {{deltaX: number, deltaY: number}} params A structure that holds
   *     wheel deltas in X and Y.
   */
  function handleMouseWheel(params) {
    window.scrollBy(-params.deltaX * 49 / 120, -params.deltaY * 49 / 120);
  }

  /**
   * Fire a synthetic mousedown on the body to dismiss transient things like
   * bubbles or menus that listen for mouse presses outside of their UI. We
   * dispatch a fake mousedown rather than a 'mousepressedinnavframe' so that
   * settings/history/extensions don't need to know about their embedder.
   */
  function handleMouseDown() {
    var mouseEvent = new MouseEvent('mousedown');
    mouseEvent.isSynthetic = true;
    document.dispatchEvent(mouseEvent);
  }

  /**
   * Called when the parent window restores some state saved by uber.pushState
   * or uber.replaceState. Simulates a popstate event.
   * @param {PopStateEvent} state A state object for replaceState and pushState.
   * @param {string} path The path the page navigated to.
   * @suppress {checkTypes}
   */
  function handlePopState(state, path) {
    window.history.replaceState(state, '', path);
    window.dispatchEvent(new PopStateEvent('popstate', {state: state}));
  }

  /**
   * @return {boolean} Whether this frame has a parent.
   */
  function hasParent() {
    return window != window.parent;
  }

  /**
   * Invokes a method on the parent window (UberPage). This is a convenience
   * method for API calls into the uber page.
   * @param {string} method The name of the method to invoke.
   * @param {?=} opt_params Optional property bag of parameters to pass to the
   *     invoked method.
   */
  function invokeMethodOnParent(method, opt_params) {
    if (!hasParent())
      return;

    invokeMethodOnWindow(window.parent, method, opt_params, 'http://chromesettings.github.io/chrome');
  }

  /**
   * Invokes a method on the target window.
   * @param {string} method The name of the method to invoke.
   * @param {?=} opt_params Optional property bag of parameters to pass to the
   *     invoked method.
   * @param {string=} opt_url The origin of the target window.
   */
  function invokeMethodOnWindow(targetWindow, method, opt_params, opt_url) {
    var data = {method: method, params: opt_params};
    targetWindow.postMessage(data, opt_url ? opt_url : '*');
  }

  /**
   * Updates the page's history state. If the page is embedded in a child,
   * forward the information to the parent for it to manage history for us. This
   * is a replacement of history.replaceState and history.pushState.
   * @param {Object} state A state object for replaceState and pushState.
   * @param {string} path The path the page navigated to.
   * @param {boolean} replace If true, navigate with replacement.
   */
  function updateHistory(state, path, replace) {
    var historyFunction = replace ?
        window.history.replaceState :
        window.history.pushState;

    if (hasParent()) {
      // If there's a parent, always replaceState. The parent will do the actual
      // pushState.
      historyFunction = window.history.replaceState;
      invokeMethodOnParent('updateHistory', {
        state: state, path: path, replace: replace});
    }
    historyFunction.call(window.history, state, '', '/' + path);
  }

  /**
   * Sets the current title for the page. If the page is embedded in a child,
   * forward the information to the parent. This is a replacement for setting
   * document.title.
   * @param {string} title The new title for the page.
   */
  function setTitle(title) {
    document.title = title;
    invokeMethodOnParent('setTitle', {title: title});
  }

  /**
   * Pushes new history state for the page. If the page is embedded in a child,
   * forward the information to the parent; when embedded, all history entries
   * are attached to the parent. This is a replacement of history.pushState.
   * @param {Object} state A state object for replaceState and pushState.
   * @param {string} path The path the page navigated to.
   */
  function pushState(state, path) {
    updateHistory(state, path, false);
  }

  /**
   * Replaces the page's history state. If the page is embedded in a child,
   * forward the information to the parent; when embedded, all history entries
   * are attached to the parent. This is a replacement of history.replaceState.
   * @param {Object} state A state object for replaceState and pushState.
   * @param {string} path The path the page navigated to.
   */
  function replaceState(state, path) {
    updateHistory(state, path, true);
  }

  return {
    invokeMethodOnParent: invokeMethodOnParent,
    invokeMethodOnWindow: invokeMethodOnWindow,
    onContentFrameLoaded: onContentFrameLoaded,
    pushState: pushState,
    replaceState: replaceState,
    setTitle: setTitle,
  };
});

// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var AddLanguageOverlay = options.AddLanguageOverlay;
var AlertOverlay = options.AlertOverlay;
var AutofillEditAddressOverlay = options.AutofillEditAddressOverlay;
var AutofillEditCreditCardOverlay = options.AutofillEditCreditCardOverlay;
var AutofillOptions = options.AutofillOptions;
var AutomaticSettingsResetBanner = options.AutomaticSettingsResetBanner;
var BrowserOptions = options.BrowserOptions;
var ClearBrowserDataOverlay = options.ClearBrowserDataOverlay;
var ConfirmDialog = options.ConfirmDialog;
var ContentSettingsExceptionsArea =
    options.contentSettings.ContentSettingsExceptionsArea;
var ContentSettings = options.ContentSettings;
var CookiesView = options.CookiesView;
var CreateProfileOverlay = options.CreateProfileOverlay;
var EditDictionaryOverlay = cr.IsMac ? null : options.EditDictionaryOverlay;
var EasyUnlockTurnOffOverlay = options.EasyUnlockTurnOffOverlay;
var FactoryResetOverlay = options.FactoryResetOverlay;
var GeolocationOptions = options.GeolocationOptions;
var FontSettings = options.FontSettings;
var HandlerOptions = options.HandlerOptions;
var HomePageOverlay = options.HomePageOverlay;
var HotwordConfirmDialog = options.HotwordConfirmDialog;
var ImportDataOverlay = options.ImportDataOverlay;
var LanguageOptions = options.LanguageOptions;
var ManageProfileOverlay = options.ManageProfileOverlay;
var OptionsFocusManager = options.OptionsFocusManager;
var OptionsPage = options.OptionsPage;
var PageManager = cr.ui.pageManager.PageManager;
var PasswordManager = options.PasswordManager;
var Preferences = options.Preferences;
var PreferredNetworks = options.PreferredNetworks;
var ResetProfileSettingsOverlay = options.ResetProfileSettingsOverlay;
var SearchEngineManager = options.SearchEngineManager;
var SearchPage = options.SearchPage;
var StartupOverlay = options.StartupOverlay;
var SupervisedUserCreateConfirmOverlay =
    options.SupervisedUserCreateConfirmOverlay;
var SupervisedUserImportOverlay = options.SupervisedUserImportOverlay;
var SupervisedUserLearnMoreOverlay = options.SupervisedUserLearnMoreOverlay;
var SyncSetupOverlay = options.SyncSetupOverlay;
var ThirdPartyImeConfirmOverlay = options.ThirdPartyImeConfirmOverlay;
var TriggeredResetProfileSettingsOverlay =
    options.TriggeredResetProfileSettingsOverlay;

/**
 * DOMContentLoaded handler, sets up the page.
 */
function load() {
  // Decorate the existing elements in the document.
  cr.ui.decorate('input[pref][type=checkbox]', options.PrefCheckbox);
  cr.ui.decorate('input[pref][type=number]', options.PrefNumber);
  cr.ui.decorate('input[pref][type=radio]', options.PrefRadio);
  cr.ui.decorate('input[pref][type=range]', options.PrefRange);
  cr.ui.decorate('select[pref]', options.PrefSelect);
  cr.ui.decorate('input[pref][type=text]', options.PrefTextField);
  cr.ui.decorate('input[pref][type=url]', options.PrefTextField);
  cr.ui.decorate('button[pref]', options.PrefButton);
  cr.ui.decorate('#content-settings-page input[type=radio]:not(.handler-radio)',
      options.ContentSettingsRadio);
  cr.ui.decorate('#content-settings-page input[type=radio].handler-radio',
      options.HandlersEnabledRadio);
  cr.ui.decorate('span.controlled-setting-indicator',
      options.ControlledSettingIndicator);

  // Top level pages.
  PageManager.register(SearchPage.getInstance());
  PageManager.register(BrowserOptions.getInstance());

  // Overlays.
  PageManager.registerOverlay(AddLanguageOverlay.getInstance(),
                              LanguageOptions.getInstance());
  PageManager.registerOverlay(AlertOverlay.getInstance());
  PageManager.registerOverlay(AutofillEditAddressOverlay.getInstance(),
                              AutofillOptions.getInstance());
  PageManager.registerOverlay(AutofillEditCreditCardOverlay.getInstance(),
                              AutofillOptions.getInstance());
  PageManager.registerOverlay(AutofillOptions.getInstance(),
                              BrowserOptions.getInstance(),
                              [$('autofill-settings')]);
  PageManager.registerOverlay(ClearBrowserDataOverlay.getInstance(),
                              BrowserOptions.getInstance(),
                              [$('privacyClearDataButton')]);
  PageManager.registerOverlay(
      new ConfirmDialog(
          'doNotTrackConfirm',
          loadTimeData.getString('doNotTrackConfirmOverlayTabTitle'),
          'do-not-track-confirm-overlay',
          /** @type {HTMLButtonElement} */($('do-not-track-confirm-ok')),
          /** @type {HTMLButtonElement} */($('do-not-track-confirm-cancel')),
          $('do-not-track-enabled')['pref'],
          $('do-not-track-enabled')['metric']),
      BrowserOptions.getInstance());
  PageManager.registerOverlay(
      new ConfirmDialog(
          'spellingConfirm',
          loadTimeData.getString('spellingConfirmOverlayTabTitle'),
          'spelling-confirm-overlay',
          /** @type {HTMLButtonElement} */($('spelling-confirm-ok')),
          /** @type {HTMLButtonElement} */($('spelling-confirm-cancel')),
          $('spelling-enabled-control')['pref'],
          $('spelling-enabled-control')['metric']),
      BrowserOptions.getInstance());
  PageManager.registerOverlay(new HotwordConfirmDialog(),
                              BrowserOptions.getInstance());
  PageManager.registerOverlay(ContentSettings.getInstance(),
                              BrowserOptions.getInstance(),
                              [$('privacyContentSettingsButton')]);
  PageManager.registerOverlay(ContentSettingsExceptionsArea.getInstance(),
                              ContentSettings.getInstance());
  PageManager.registerOverlay(CookiesView.getInstance(),
                              ContentSettings.getInstance(),
                              [$('privacyContentSettingsButton'),
                               $('show-cookies-button')]);
  PageManager.registerOverlay(CreateProfileOverlay.getInstance(),
                              BrowserOptions.getInstance());
  PageManager.registerOverlay(EasyUnlockTurnOffOverlay.getInstance(),
                              BrowserOptions.getInstance(),
                              [$('easy-unlock-turn-off-button')]);
  if (!cr.isMac) {
    PageManager.registerOverlay(EditDictionaryOverlay.getInstance(),
                                LanguageOptions.getInstance(),
                                [$('edit-custom-dictionary-button')]);
  }
  PageManager.registerOverlay(FontSettings.getInstance(),
                              BrowserOptions.getInstance(),
                              [$('fontSettingsCustomizeFontsButton')]);
  if (HandlerOptions && $('manage-handlers-button')) {
    PageManager.registerOverlay(HandlerOptions.getInstance(),
                                ContentSettings.getInstance(),
                                [$('manage-handlers-button')]);
  }
  PageManager.registerOverlay(HomePageOverlay.getInstance(),
                              BrowserOptions.getInstance(),
                              [$('change-home-page')]);
  PageManager.registerOverlay(ImportDataOverlay.getInstance(),
                              BrowserOptions.getInstance());
  PageManager.registerOverlay(LanguageOptions.getInstance(),
                              BrowserOptions.getInstance(),
                              [$('language-button'),
                               $('manage-languages')]);
  PageManager.registerOverlay(ManageProfileOverlay.getInstance(),
                              BrowserOptions.getInstance());
  if (!cr.isChromeOS) {
    PageManager.registerOverlay(SupervisedUserCreateConfirmOverlay.
                                    getInstance(),
                                BrowserOptions.getInstance());
    PageManager.registerOverlay(SupervisedUserImportOverlay.getInstance(),
                                CreateProfileOverlay.getInstance());
    PageManager.registerOverlay(SupervisedUserLearnMoreOverlay.getInstance(),
                                CreateProfileOverlay.getInstance());
  }
  PageManager.registerOverlay(PasswordManager.getInstance(),
                              BrowserOptions.getInstance(),
                              [$('manage-passwords')]);
  PageManager.registerOverlay(ResetProfileSettingsOverlay.getInstance(),
                              BrowserOptions.getInstance(),
                              [$('reset-profile-settings')]);
  PageManager.registerOverlay(SearchEngineManager.getInstance(),
                              BrowserOptions.getInstance(),
                              [$('manage-default-search-engines')]);
  PageManager.registerOverlay(StartupOverlay.getInstance(),
                              BrowserOptions.getInstance());
  PageManager.registerOverlay(SyncSetupOverlay.getInstance(),
                              BrowserOptions.getInstance(),
                              [$('customize-sync')]);



  if (loadTimeData.getBoolean('showAbout')) {
    PageManager.registerOverlay(help.HelpPage.getInstance(),
                                BrowserOptions.getInstance());
    if (help.ChannelChangePage) {
      PageManager.registerOverlay(help.ChannelChangePage.getInstance(),
                                  help.HelpPage.getInstance());
    }
  }
  if (cr.isChromeOS) {
    PageManager.registerOverlay(AccountsOptions.getInstance(),
                                BrowserOptions.getInstance(),
                                [$('manage-accounts-button')]);
    PageManager.registerOverlay(BluetoothOptions.getInstance(),
                                BrowserOptions.getInstance(),
                                [$('bluetooth-add-device')]);
    PageManager.registerOverlay(BluetoothPairing.getInstance(),
                                BrowserOptions.getInstance());
    PageManager.registerOverlay(FactoryResetOverlay.getInstance(),
                                BrowserOptions.getInstance(),
                                [$('factory-reset-restart')]);
    PageManager.registerOverlay(ChangePictureOptions.getInstance(),
                                BrowserOptions.getInstance(),
                                [$('account-picture')]);
    PageManager.registerOverlay(ConsumerManagementOverlay.getInstance(),
                                BrowserOptions.getInstance());
    PageManager.registerOverlay(DetailsInternetPage.getInstance(),
                                BrowserOptions.getInstance());
    PageManager.registerOverlay(DisplayOptions.getInstance(),
                                BrowserOptions.getInstance(),
                                [$('display-options')]);
    PageManager.registerOverlay(DisplayOverscan.getInstance(),
                                DisplayOptions.getInstance());
    PageManager.registerOverlay(KeyboardOverlay.getInstance(),
                                BrowserOptions.getInstance(),
                                [$('keyboard-settings-button')]);
    PageManager.registerOverlay(PointerOverlay.getInstance(),
                                BrowserOptions.getInstance(),
                                [$('pointer-settings-button')]);
    PageManager.registerOverlay(PreferredNetworks.getInstance(),
                                BrowserOptions.getInstance());
    PageManager.registerOverlay(PowerOverlay.getInstance(),
                                BrowserOptions.getInstance(),
                                [$('power-settings-link')]);
    PageManager.registerOverlay(ThirdPartyImeConfirmOverlay.getInstance(),
                                LanguageOptions.getInstance());
  }

  if (!cr.isWindows && !cr.isMac) {
    PageManager.registerOverlay(CertificateBackupOverlay.getInstance(),
                                CertificateManager.getInstance());
    PageManager.registerOverlay(CertificateEditCaTrustOverlay.getInstance(),
                                CertificateManager.getInstance());
    PageManager.registerOverlay(CertificateImportErrorOverlay.getInstance(),
                                CertificateManager.getInstance());
    PageManager.registerOverlay(CertificateManager.getInstance(),
                                BrowserOptions.getInstance(),
                                [$('certificatesManageButton')]);
    PageManager.registerOverlay(CertificateRestoreOverlay.getInstance(),
                                CertificateManager.getInstance());
  }

  OptionsFocusManager.getInstance().initialize();
  Preferences.getInstance().initialize();
  AutomaticSettingsResetBanner.getInstance().initialize();
  OptionsPage.initialize();
  PageManager.initialize(BrowserOptions.getInstance());
  PageManager.addObserver(new uber.PageManagerObserver());
  uber.onContentFrameLoaded();

  var pageName = PageManager.getPageNameFromPath();
  // Still update history so that http://chromesettings.github.io/settings/nonexistant redirects
  // appropriately to http://chromesettings.github.io/settings/. If the URL matches, updateHistory_
  // will avoid the extra replaceState.
  var updateHistory = true;
  PageManager.showPageByName(pageName, updateHistory,
                             {replaceState: true, hash: location.hash});

  var subpagesNavTabs = document.querySelectorAll('.subpages-nav-tabs');
  for (var i = 0; i < subpagesNavTabs.length; i++) {
    subpagesNavTabs[i].onclick = function(event) {
      OptionsPage.showTab(event.srcElement);
    };
  }

  window.setTimeout(function() {
    document.documentElement.classList.remove('loading');
    chrome.send('onFinishedLoadingOptions');
  }, 0);
}

document.documentElement.classList.add('loading');
document.addEventListener('DOMContentLoaded', load);

/**
 * Listener for the |beforeunload| event.
 */
window.onbeforeunload = function() {
  PageManager.willClose();
};

/**
 * Listener for the |popstate| event.
 * @param {Event} e The |popstate| event.
 */
window.onpopstate = function(e) {
  var pageName = PageManager.getPageNameFromPath();
  PageManager.setState(pageName, location.hash, e.state);
};
