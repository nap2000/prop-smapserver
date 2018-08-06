package org.smap.sdal.managers;

import java.sql.Connection;
import java.util.ArrayList;
import java.util.ResourceBundle;
import java.util.logging.Logger;

import org.smap.sdal.Utilities.GeneralUtilityMethods;
import org.smap.sdal.Utilities.UtilityMethodsEmail;
import org.smap.sdal.model.Label;
import org.smap.sdal.model.LanguageItem;
import org.smap.sdal.model.Option;
import org.smap.sdal.model.Question;

/*****************************************************************************

This file is part of SMAP.

SMAP is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

SMAP is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with SMAP.  If not, see <http://www.gnu.org/licenses/>.

 ******************************************************************************/

public class ChoiceManager {
	
	private static Logger log =
			 Logger.getLogger(ChoiceManager.class.getName());

	private ResourceBundle localisation;
	
	public ChoiceManager(ResourceBundle l) {
		localisation = l;
	}
	
	
	public String getLabel(Connection sd, Connection cResults, String user, int oId, int sId, int qId, int l_id, boolean external_choices, String external_table, String languageName,
			ArrayList<String> matches) throws Exception {
		
		StringBuffer labels = new StringBuffer("");
		
		// Only check the labels if the pdfvalue appearance is not set
		Question q = GeneralUtilityMethods.getQuestion(sd,  qId);
		boolean checkLabels = true;
		if(q != null && q.appearance != null && q.appearance.contains("pdfvalue")) {
			checkLabels = false;
		}
		if(checkLabels) {
			if(!external_choices) {
				// 1. Search choices which are stored in the survey meta definition
				int idx = 0;
				for(String match : matches) {
					if(idx++ > 0) {
						labels.append(", ");
					}
					labels.append(UtilityMethodsEmail.getSingleLabel(sd, sId, languageName, l_id, match));
				}
			} else {
				// 2. Search choices which are stored in an external table
				ArrayList<Option> choices = GeneralUtilityMethods.getExternalChoices(sd, cResults, localisation, user, oId, sId, qId, matches);
				int idx = 0;
				int languageIdx = 0;
				if(choices != null && choices.size() > 0) {
					for(Option choice : choices) {
						if(idx++ == 0) {
							// Get the language index
							for(LanguageItem item : choice.externalLabel) {
								if(languageName == null || languageName.equals("none") || languageName.equals(item.language)) {
									break;
								} else {
									languageIdx++;
								}
							}
						} else {
							labels.append(", ");
						}
						if(choice.labels != null && choice.labels.size() > languageIdx) {
							labels.append(choice.labels.get(languageIdx).text);
						}
					}
				}			
			}
		}
		
		if(labels.length() == 0) {
			// No label found, return the original value as the label
			int idx = 0;
			for(String match : matches) {
				if(idx++ > 0) {
					labels.append(", ");
				}
				labels.append(match);
			}
		}
		
		return labels.toString();
	}

}
